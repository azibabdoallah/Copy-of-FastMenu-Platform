import { createClient } from '@supabase/supabase-js';

// رابط المشروع (صحيح)
const supabaseUrl = 'https://apdgwwzyeanxxlotwmpl.supabase.co';

// المفتاح الصحيح (وضعتُه لك داخل علامات تنصيص ليعمل فوراً)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZGd3d3p5ZWFueHhsb3R3bXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTA4MjcsImV4cCI6MjA4NDI2NjgyN30.6B6ZmJrlkX8woc5JichK0FKbMaQDbQDODeoqQHhT_u8';

export const supabase = createClient(supabaseUrl, supabaseKey);
