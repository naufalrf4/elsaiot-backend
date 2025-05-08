DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'name'
    ) THEN
        ALTER TABLE devices ADD COLUMN name VARCHAR(255);
    END IF;
END $$;
COMMIT; 