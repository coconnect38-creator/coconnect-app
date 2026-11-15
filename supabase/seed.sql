-- Reference data. Idempotent: safe to run repeatedly (npm run db:seed).

-- ───────────── 25 districts, 9 provinces ─────────────
insert into districts (slug, name_en, name_si, name_ta, province) values
  ('colombo',      'Colombo',      'කොළඹ',          'கொழும்பு',        'western'),
  ('gampaha',      'Gampaha',      'ගම්පහ',          'கம்பஹா',          'western'),
  ('kalutara',     'Kalutara',     'කළුතර',          'களுத்துறை',       'western'),
  ('kandy',        'Kandy',        'මහනුවර',         'கண்டி',           'central'),
  ('matale',       'Matale',       'මාතලේ',          'மாத்தளை',         'central'),
  ('nuwara-eliya', 'Nuwara Eliya', 'නුවරඑළිය',       'நுவரெலியா',       'central'),
  ('galle',        'Galle',        'ගාල්ල',          'காலி',            'southern'),
  ('matara',       'Matara',       'මාතර',           'மாத்தறை',         'southern'),
  ('hambantota',   'Hambantota',   'හම්බන්තොට',      'அம்பாந்தோட்டை',   'southern'),
  ('jaffna',       'Jaffna',       'යාපනය',          'யாழ்ப்பாணம்',      'northern'),
  ('kilinochchi',  'Kilinochchi',  'කිලිනොච්චිය',     'கிளிநொச்சி',       'northern'),
  ('mannar',       'Mannar',       'මන්නාරම',        'மன்னார்',          'northern'),
  ('vavuniya',     'Vavuniya',     'වවුනියාව',       'வவுனியா',         'northern'),
  ('mullaitivu',   'Mullaitivu',   'මුලතිව්',         'முல்லைத்தீவு',      'northern'),
  ('batticaloa',   'Batticaloa',   'මඩකලපුව',        'மட்டக்களப்பு',      'eastern'),
  ('ampara',       'Ampara',       'අම්පාර',          'அம்பாறை',         'eastern'),
  ('trincomalee',  'Trincomalee',  'ත්‍රිකුණාමලය',     'திருகோணமலை',      'eastern'),
  ('kurunegala',   'Kurunegala',   'කුරුණෑගල',       'குருநாகல்',        'north_western'),
  ('puttalam',     'Puttalam',     'පුත්තලම',         'புத்தளம்',         'north_western'),
  ('anuradhapura', 'Anuradhapura', 'අනුරාධපුරය',      'அனுராதபுரம்',      'north_central'),
  ('polonnaruwa',  'Polonnaruwa',  'පොළොන්නරුව',     'பொலன்னறுவை',      'north_central'),
  ('badulla',      'Badulla',      'බදුල්ල',          'பதுளை',           'uva'),
  ('monaragala',   'Monaragala',   'මොණරාගල',        'மொனராகலை',        'uva'),
  ('ratnapura',    'Ratnapura',    'රත්නපුර',         'இரத்தினபுரி',      'sabaragamuwa'),
  ('kegalle',      'Kegalle',      'කෑගල්ල',          'கேகாலை',          'sabaragamuwa')
on conflict (slug) do update set
  name_en = excluded.name_en, name_si = excluded.name_si, name_ta = excluded.name_ta, province = excluded.province;

-- ───────────── Towns under each district ─────────────
insert into cities (district_id, name_en, name_si)
select d.id, c.name_en, c.name_si
from (values
  ('colombo','Colombo','කොළඹ'), ('colombo','Dehiwala-Mount Lavinia','දෙහිවල-ගල්කිස්ස'), ('colombo','Moratuwa','මොරටුව'),
  ('colombo','Sri Jayawardenepura Kotte','ශ්‍රී ජයවර්ධනපුර කෝට්ටේ'), ('colombo','Maharagama','මහරගම'),
  ('colombo','Homagama','හෝමාගම'), ('colombo','Kaduwela','කඩුවෙල'), ('colombo','Avissawella','අවිස්සාවේල්ල'),
  ('gampaha','Gampaha','ගම්පහ'), ('gampaha','Negombo','මීගමුව'), ('gampaha','Ja-Ela','ජා-ඇල'), ('gampaha','Wattala','වත්තල'),
  ('gampaha','Minuwangoda','මිනුවන්ගොඩ'), ('gampaha','Divulapitiya','දිවුලපිටිය'), ('gampaha','Nittambuwa','නිට්ටඹුව'),
  ('gampaha','Kiribathgoda','කිරිබත්ගොඩ'),
  ('kalutara','Kalutara','කළුතර'), ('kalutara','Panadura','පානදුර'), ('kalutara','Horana','හොරණ'),
  ('kalutara','Beruwala','බේරුවල'), ('kalutara','Matugama','මතුගම'), ('kalutara','Aluthgama','අළුත්ගම'),
  ('kandy','Kandy','මහනුවර'), ('kandy','Peradeniya','පේරාදෙණිය'), ('kandy','Katugastota','කටුගස්තොට'),
  ('kandy','Gampola','ගම්පොළ'), ('kandy','Nawalapitiya','නාවලපිටිය'), ('kandy','Kundasale','කුණ්ඩසාලේ'),
  ('matale','Matale','මාතලේ'), ('matale','Dambulla','දඹුල්ල'), ('matale','Galewela','ගලේවෙල'), ('matale','Ukuwela','උකුවෙල'),
  ('nuwara-eliya','Nuwara Eliya','නුවරඑළිය'), ('nuwara-eliya','Hatton','හැටන්'), ('nuwara-eliya','Talawakele','තලවාකැලේ'),
  ('nuwara-eliya','Walapane','වලපනේ'),
  ('galle','Galle','ගාල්ල'), ('galle','Ambalangoda','අම්බලන්ගොඩ'), ('galle','Hikkaduwa','හික්කඩුව'),
  ('galle','Elpitiya','ඇල්පිටිය'), ('galle','Baddegama','බද්දේගම'),
  ('matara','Matara','මාතර'), ('matara','Weligama','වැලිගම'), ('matara','Akuressa','අකුරැස්ස'),
  ('matara','Dikwella','දික්වැල්ල'), ('matara','Deniyaya','දෙනියාය'),
  ('hambantota','Hambantota','හම්බන්තොට'), ('hambantota','Tangalle','තංගල්ල'), ('hambantota','Tissamaharama','තිස්සමහාරාමය'),
  ('hambantota','Ambalantota','අම්බලන්තොට'), ('hambantota','Beliatta','බෙලිඅත්ත'),
  ('jaffna','Jaffna','යාපනය'), ('jaffna','Chavakachcheri','චාවකච්චේරි'), ('jaffna','Point Pedro','පේදුරුතුඩුව'), ('jaffna','Nallur','නල්ලූර්'),
  ('kilinochchi','Kilinochchi','කිලිනොච්චිය'), ('kilinochchi','Paranthan','පරන්තන්'),
  ('mannar','Mannar','මන්නාරම'), ('mannar','Madhu','මඩු'),
  ('vavuniya','Vavuniya','වවුනියාව'), ('vavuniya','Cheddikulam','චෙට්ටිකුලම්'),
  ('mullaitivu','Mullaitivu','මුලතිව්'), ('mullaitivu','Puthukkudiyiruppu','පුදුකුඩිඉරිප්පු'),
  ('batticaloa','Batticaloa','මඩකලපුව'), ('batticaloa','Kattankudy','කාත්තන්කුඩි'), ('batticaloa','Eravur','ඒරාවූර්'),
  ('ampara','Ampara','අම්පාර'), ('ampara','Kalmunai','කල්මුණේ'), ('ampara','Akkaraipattu','අක්කරපත්තුව'),
  ('ampara','Dehiattakandiya','දෙහිඅත්තකණ්ඩිය'),
  ('trincomalee','Trincomalee','ත්‍රිකුණාමලය'), ('trincomalee','Kantale','කන්තලේ'), ('trincomalee','Kinniya','කින්නියා'),
  ('kurunegala','Kurunegala','කුරුණෑගල'), ('kurunegala','Kuliyapitiya','කුලියාපිටිය'), ('kurunegala','Narammala','නාරම්මල'),
  ('kurunegala','Pannala','පන්නල'), ('kurunegala','Wariyapola','වාරියපොල'), ('kurunegala','Polgahawela','පොල්ගහවෙල'),
  ('kurunegala','Nikaweratiya','නිකවැරටිය'), ('kurunegala','Mawathagama','මාවතගම'),
  ('puttalam','Puttalam','පුත්තලම'), ('puttalam','Chilaw','හලාවත'), ('puttalam','Wennappuwa','වෙන්නප්පුව'),
  ('puttalam','Marawila','මාරවිල'), ('puttalam','Dankotuwa','දංකොටුව'), ('puttalam','Nattandiya','නාත්තණ්ඩිය'),
  ('anuradhapura','Anuradhapura','අනුරාධපුරය'), ('anuradhapura','Kekirawa','කැකිරාව'), ('anuradhapura','Medawachchiya','මැදවච්චිය'),
  ('anuradhapura','Thambuttegama','තඹුත්තේගම'), ('anuradhapura','Eppawala','එප්පාවල'),
  ('polonnaruwa','Polonnaruwa','පොළොන්නරුව'), ('polonnaruwa','Hingurakgoda','හිඟුරක්ගොඩ'), ('polonnaruwa','Medirigiriya','මැදිරිගිරිය'),
  ('badulla','Badulla','බදුල්ල'), ('badulla','Bandarawela','බණ්ඩාරවෙල'), ('badulla','Welimada','වැලිමඩ'),
  ('badulla','Mahiyanganaya','මහියංගනය'), ('badulla','Haputale','හපුතලේ'),
  ('monaragala','Monaragala','මොණරාගල'), ('monaragala','Wellawaya','වැල්ලවාය'), ('monaragala','Bibile','බිබිල'), ('monaragala','Buttala','බුත්තල'),
  ('ratnapura','Ratnapura','රත්නපුර'), ('ratnapura','Embilipitiya','ඇඹිලිපිටිය'), ('ratnapura','Balangoda','බලංගොඩ'),
  ('ratnapura','Pelmadulla','පැල්මඩුල්ල'), ('ratnapura','Eheliyagoda','ඇහැළියගොඩ'),
  ('kegalle','Kegalle','කෑගල්ල'), ('kegalle','Mawanella','මාවනැල්ල'), ('kegalle','Warakapola','වරකාපොල'),
  ('kegalle','Rambukkana','රඹුක්කන'), ('kegalle','Ruwanwella','රුවන්වැල්ල')
) as c(district_slug, name_en, name_si)
join districts d on d.slug = c.district_slug
on conflict (district_id, name_en) do update set name_si = excluded.name_si;

-- ───────────── Categories (admins add more from /admin/categories) ─────────────
insert into categories (slug, parent_id, name_en, name_si, name_ta, icon, default_rate_unit, sort_order) values
  ('coconut',      null, 'Coconut plantation', 'පොල් වතු',  'தென்னந்தோட்டம்', 'tree-palm', 'per_worker_per_day', 10),
  ('construction', null, 'Construction',       'ඉදිකිරීම්',  'கட்டுமானம்',     'hard-hat',  'per_worker_per_day', 20)
on conflict (slug) do nothing;

insert into categories (slug, parent_id, name_en, name_si, name_ta, icon, default_rate_unit, sort_order)
select c.slug, p.id, c.name_en, c.name_si, c.name_ta, c.icon, c.unit::rate_unit, c.sort_order
from (values
  ('coconut-plucking', 'coconut',      'Coconut plucking',        'පොල් කැඩීම',                   'தேங்காய் பறித்தல்',              'tree-palm',    'per_worker_per_day', 11),
  ('coconut-husking',  'coconut',      'Husking & collecting',    'පොල් ලෙලි ගැසීම සහ එකතු කිරීම',   'தேங்காய் உரித்தல் மற்றும் சேகரித்தல்', 'package',      'per_worker_per_day', 12),
  ('plantation-care',  'coconut',      'Weeding & fertilising',   'වල් නෙලීම සහ පොහොර යෙදීම',       'களையெடுத்தல் மற்றும் உரமிடுதல்',    'sprout',       'per_worker_per_day', 13),
  ('land-clearing',    'coconut',      'Land clearing',           'ඉඩම් එළි කිරීම',               'நிலம் சுத்தம் செய்தல்',           'shovel',       'per_worker_per_day', 14),
  ('masonry',          'construction', 'Masonry',                 'පෙදරේරු වැඩ',                  'கொத்து வேலை',                  'brick-wall',   'per_worker_per_day', 21),
  ('carpentry',        'construction', 'Carpentry',               'වඩු වැඩ',                      'தச்சு வேலை',                   'hammer',       'per_worker_per_day', 22),
  ('general-labour',   'construction', 'General labour',          'සාමාන්‍ය කම්කරු වැඩ',             'பொது கூலி வேலை',               'users',        'per_worker_per_day', 23),
  ('painting',         'construction', 'Painting',                'තීන්ත ආලේප කිරීම',             'வர்ணம் பூசுதல்',                'paint-roller', 'per_worker_per_day', 24)
) as c(slug, parent_slug, name_en, name_si, name_ta, icon, unit, sort_order)
join categories p on p.slug = c.parent_slug
on conflict (slug) do nothing;

-- ───────────── Settings ─────────────
insert into app_settings (key, value, is_public) values
  ('fees_enabled',               'false', true),
  ('job_expiry_days',            '30',    true),
  ('bank_details',               '{"bank":"","account":"","branch":"","name":""}', true),
  ('maintenance_banner',         '""',    true),
  ('require_phone_verification', 'false', true)
on conflict (key) do nothing;
