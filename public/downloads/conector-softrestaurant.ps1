# Conector Soft Restaurant -> Valladolid.mx (pantalla de caja)
# Lee en SOLO LECTURA las cuentas abiertas de Soft Restaurant y marca las mesas
# ocupadas/libres en la caja de Valladolid.mx. Nunca escribe en Soft Restaurant.
# Solo libera las mesas que este conector ocupó; lo marcado a mano no se toca.
$ErrorActionPreference = "Stop"
$Api = "https://qjlfwsqsrzikjilicoad.supabase.co/rest/v1/rpc"
$Key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbGZ3c3Fzcnppa2ppbGljb2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTEzMzcsImV4cCI6MjA5ODI2NzMzN30.41MUXgf32RTv5h4TucGMvlTAn0dwKg47qBVC_VurvRg"
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $Dir "conector-config.json"
$StatePath = Join-Path $Dir "conector-estado.json"

function Log($m) { Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $m) }

if (-not (Test-Path $ConfigPath)) {
  Write-Host "=== Primera configuracion del conector Valladolid.mx ==="
  $slug = Read-Host "Nombre web del restaurante (lo que va despues de /caja/, ej. copalli-cafe)"
  $pin = Read-Host "PIN de caja"
  $srv = Read-Host "Servidor SQL de Soft Restaurant (Enter = .\NATIONALSOFT)"
  if (-not $srv) { $srv = ".\NATIONALSOFT" }
  $cfg = [ordered]@{
    slug = $slug.Trim(); pin = $pin.Trim(); servidorSql = $srv; baseDatos = ""
    usuarioSql = ""; claveSql = ""; segundos = 10; personasPorOmision = 2
    consultaSql = "SELECT CAST(mesa AS varchar(40)) AS mesa, ISNULL(nopersonas,0) AS personas FROM tempcheques WHERE ISNULL(pagado,0)=0 AND ISNULL(cancelado,0)=0 AND mesa IS NOT NULL AND LTRIM(RTRIM(CAST(mesa AS varchar(40))))<>''"
  }
  $cfg | ConvertTo-Json | Set-Content -Encoding UTF8 $ConfigPath
  Log "Configuracion guardada en $ConfigPath"
}
$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$state = @{}
if (Test-Path $StatePath) { (Get-Content $StatePath -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $state[$_.Name] = $_.Value } }
function SaveState { $state | ConvertTo-Json | Set-Content -Encoding UTF8 $StatePath }

function Rpc($fn, $body) {
  $h = @{ apikey = $Key; Authorization = "Bearer $Key"; "Content-Type" = "application/json" }
  Invoke-RestMethod -Method Post -Uri "$Api/$fn" -Headers $h -Body ($body | ConvertTo-Json -Compress -Depth 5)
}

function ConnString($db) {
  $s = "Server=$($cfg.servidorSql);Connect Timeout=8;ApplicationIntent=ReadOnly;"
  if ($db) { $s += "Database=$db;" }
  if ($cfg.usuarioSql) { $s += "User ID=$($cfg.usuarioSql);Password=$($cfg.claveSql);" } else { $s += "Integrated Security=True;" }
  $s
}
function Query($db, $sql) {
  $c = New-Object System.Data.SqlClient.SqlConnection (ConnString $db)
  $c.Open()
  try {
    $cmd = $c.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 8
    $t = New-Object System.Data.DataTable; $t.Load($cmd.ExecuteReader()); ,$t
  } finally { $c.Close() }
}
function FindDatabase {
  if ($cfg.baseDatos) { return $cfg.baseDatos }
  $dbs = Query "master" "SELECT name FROM sys.databases WHERE database_id > 4 AND state = 0"
  foreach ($r in $dbs.Rows) {
    $n = $r.name
    try {
      $x = Query $n "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tempcheques'"
      if ($x.Rows[0].c -gt 0) { Log "Base de Soft Restaurant encontrada: $n"; return $n }
    } catch {}
  }
  throw "No encontre la base de Soft Restaurant (tabla tempcheques). Escribe 'baseDatos' en conector-config.json."
}

function Norm($s) { ("$s").Trim().ToLower() -replace '^mesa\s*', '' }
function BoardTables($b) {
  if ($b.floor_plan -and $b.floor_plan.Count -gt 0) { return $b.floor_plan | ForEach-Object { @{ id = $_.id; label = $_.label } } }
  $out = @(); $n = 0
  foreach ($g in $b.tables) { for ($i = 0; $i -lt [Math]::Min($g.count, 60); $i++) { $n++; $out += @{ id = "m$n"; label = "Mesa $n" } } }
  $out
}

$token = $null; $db = $null
Log "Conector iniciado. Deja esta ventana abierta. Ctrl+C para detener."
while ($true) {
  try {
    if (-not $token) {
      $r = Rpc "restaurant_cashier_login" @{ _slug = $cfg.slug; _pin = $cfg.pin }
      if (-not $r.ok) { throw "PIN incorrecto. Corrige 'pin' en conector-config.json." }
      $token = $r.token; Log "Conectado a la caja de $($r.name)"
    }
    if (-not $db) { $db = FindDatabase }
    $open = @{}
    foreach ($row in (Query $db $cfg.consultaSql).Rows) { $open[(Norm $row.mesa)] = [int]$row.personas }

    $board = Rpc "restaurant_cashier_board" @{ _token = $token }
    $tables = BoardTables $board
    $now = [DateTime]::UtcNow
    foreach ($t in $tables) {
      $k = Norm $t.label
      if (-not $open.ContainsKey($k)) { continue }
      $busy = $board.reservations | Where-Object { $_.table_id -eq $t.id -and $_.status -eq "sentada" -and ([DateTime]$_.ends_at).ToUniversalTime() -gt $now }
      if ($busy) { continue }
      $p = $open[$k]; if ($p -lt 1) { $p = [int]$cfg.personasPorOmision }
      try {
        $id = Rpc "restaurant_cashier_seat" @{ _token = $token; _table_id = $t.id; _party = $p }
        $state[$t.id] = "$id"; SaveState; Log "$($t.label) ocupada (cuenta abierta en Soft Restaurant)"
      } catch { if ("$_" -notmatch "table_taken") { throw } }
    }
    foreach ($tid in @($state.Keys)) {
      $t = $tables | Where-Object { $_.id -eq $tid } | Select-Object -First 1
      if ($t -and $open.ContainsKey((Norm $t.label))) { continue }
      try { Rpc "restaurant_cashier_set" @{ _token = $token; _reservation_id = $state[$tid]; _action = "liberar" } | Out-Null; Log "Mesa $tid liberada (cuenta cerrada)" }
      catch { if ("$_" -notmatch "invalid_state|not_found") { throw } }
      $state.Remove($tid); SaveState
    }
  } catch {
    $m = "$_"
    if ($m -match "session_expired") { $token = $null; Log "Sesion vencida, entrando de nuevo..." }
    else { Log "Aviso: $m"; if ($m -match "SQL|servidor|tempcheques") { $db = $null } }
  }
  Start-Sleep -Seconds ([int]$cfg.segundos)
}
