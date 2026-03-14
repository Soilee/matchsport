-- Nutritional Tracking Schema

-- 1. Besin Veritabanı (Standards per 100g)
CREATE TABLE IF NOT EXISTS public.food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    protein_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
    carbs_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
    fat_100g DECIMAL(10,2) NOT NULL DEFAULT 0,
    calories_100g INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Kullanıcı Beslenme Kayıtları
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    food_item_id UUID REFERENCES public.food_items(id),
    quantity_g DECIMAL(10,2) NOT NULL DEFAULT 100,
    log_date DATE DEFAULT CURRENT_DATE,
    meal_type TEXT DEFAULT 'main', -- breakfast, lunch, dinner, snack
    protein_g DECIMAL(10,2) DEFAULT 0,
    carbs_g DECIMAL(10,2) DEFAULT 0,
    fat_g DECIMAL(10,2) DEFAULT 0,
    calories INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Besinler herkes tarafından görülebilir" ON public.food_items FOR SELECT USING (true);
CREATE POLICY "Kullanıcılar sadece kendi kayıtlarını görebilir" ON public.nutrition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Kullanıcılar kayıt ekleyebilir" ON public.nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Hocalar ve Adminler herkesi görebilir" ON public.nutrition_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- Sample Data
INSERT INTO public.food_items (name, protein_100g, carbs_100g, fat_100g, calories_100g) VALUES
('Tavuk Göğsü (Pişmiş)', 31.0, 0.0, 3.6, 165),
('Pirinç Pilavı', 2.7, 28.0, 0.3, 130),
('Zeytinyağı', 0.0, 0.0, 100.0, 884),
('Yulaf Ezmesi', 13.5, 68.7, 7.0, 389),
('Yumurta (Adet)', 13.0, 1.1, 11.0, 155),
('Fıstık Ezmesi', 25.0, 20.0, 50.0, 588),
('Lor Peyniri', 13.0, 3.0, 2.0, 85);
