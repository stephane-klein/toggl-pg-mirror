INSERT INTO contacts (firstname, lastname)
     VALUES ('Alice', 'Martin'),
            ('Bob', 'Durand'),
            ('Charlie', 'Petit')
   ON CONFLICT DO NOTHING;
