const https = require('https');

const url = 'https://tksfghofotjbcnyqteam.supabase.co/storage/v1/object/public/properties/default-image.jpg'; // We'll just fetch ANY property image url. Let's fetch one from supabase first.

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tksfghofotjbcnyqteam.supabase.co', 'sb_publishable_PBJ_ChR2TuOVAnh7WyMtWw_BUw_5dad');

async function test() {
  const { data: props } = await supabase.from('properties').select('image_url').limit(1);
  if (!props || !props.length) return console.log("No props");

  const originalUrl = props[0].image_url;
  console.log("Original URL:", originalUrl);

  // If it's supabase, change object/public to render/image/public?width=400
  let transformUrl = originalUrl;
  if (originalUrl.includes('/object/public/')) {
     transformUrl = originalUrl.replace('/object/public/', '/render/image/public/') + '?width=400&resize=contain';
     console.log("Transform URL:", transformUrl);

     https.get(transformUrl, (res) => {
        console.log("Status Code:", res.statusCode);
     }).on('error', (e) => {
        console.error(e);
     });
  } else {
     console.log("Not a supabase storage URL.");
  }
}

test();
