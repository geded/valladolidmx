import sharp from 'sharp';
const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'>
  <defs>
    <radialGradient id='g' cx='50%' cy='50%' r='55%'>
      <stop offset='0%' stop-color='#f4d47c'/>
      <stop offset='60%' stop-color='#c4622c'/>
      <stop offset='100%' stop-color='#5a2314'/>
    </radialGradient>
  </defs>
  <circle cx='400' cy='400' r='360' fill='url(#g)' stroke='#2a0f08' stroke-width='12'/>
  <text x='400' y='340' font-family='Georgia,serif' font-size='60' text-anchor='middle' fill='#fff8ea'>ORIENTE</text>
  <text x='400' y='420' font-family='Georgia,serif' font-size='80' font-weight='bold' text-anchor='middle' fill='#fff8ea'>MAYA</text>
  <text x='400' y='500' font-family='Georgia,serif' font-size='48' text-anchor='middle' fill='#fff8ea'>Valladolid</text>
  <path d='M200 620 Q400 720 600 620' stroke='#fff8ea' stroke-width='6' fill='none'/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('scripts/media-benchmark/samples/transparent-logo.png');
console.log('generated');
