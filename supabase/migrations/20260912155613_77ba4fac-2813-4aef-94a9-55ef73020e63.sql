with d as (
  insert into public.tourism_attribute_definitions (family_key, attribute_key, label, input_type, filter_group, filterable, required, sort_order, active)
  values
    ('hoteles','check_in','Hora de llegada','single','policy',false,false,90,true),
    ('hoteles','check_out','Hora de salida','single','policy',false,false,91,true),
    ('hoteles','host_languages','Idiomas del personal','multi','secondary',false,false,92,true)
  on conflict do nothing
  returning id, attribute_key
)
insert into public.tourism_attribute_options (definition_id, value, label, sort_order, active)
select d.id, v.value, v.label, v.sort_order, true
from d
join (values
  ('check_in','14-00','A partir de las 14:00',10),
  ('check_in','15-00','A partir de las 15:00',20),
  ('check_in','16-00','A partir de las 16:00',30),
  ('check_out','10-00','Antes de las 10:00',10),
  ('check_out','11-00','Antes de las 11:00',20),
  ('check_out','12-00','Antes de las 12:00',30),
  ('host_languages','es','Español',10),
  ('host_languages','en','Inglés',20),
  ('host_languages','maya','Maya',30),
  ('host_languages','fr','Francés',40)
) as v(attribute_key, value, label, sort_order)
  on v.attribute_key = d.attribute_key
on conflict do nothing;