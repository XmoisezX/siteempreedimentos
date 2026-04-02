const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://tksfghofotjbcnyqteam.supabase.co', 'sb_publishable_PBJ_ChR2TuOVAnh7WyMtWw_BUw_5dad');

async function test() {
  const {data: props} = await supabase.from('properties').select('id').limit(1);
  if (!props || props.length === 0) return console.log("No props");

  console.log("Prop id: ", props[0].id);

  const { data, error } = await supabase.from('simulations').insert([{
    property_id: props[0].id, 
    name: 'Test',
    phone: '11999999999',
    income: 5000,
    birth_date: '01/01/1990',
    dependents: 0,
    has_second_buyer: false,
    broker_name: 'Test Broker'
  }]);

  console.log('Error:', error);
  console.log('Data:', data);
}

test();
