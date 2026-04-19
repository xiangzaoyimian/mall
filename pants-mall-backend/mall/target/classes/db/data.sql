-- admin: password 123456 (BCrypt hash)
INSERT INTO `user` (username, password, role, status, nickname)
VALUES ('admin', '$2a$10$e0MYzXyjpJS2DkLJ2.Cr3uK6fQm9dZz1Tq5G0S9bLxvN8a2G4oK8q', 'ADMIN', 'NORMAL', '管理员');

INSERT INTO category (name, parent_id, sort, status) VALUES
('牛仔裤', 0, 1, 'ON'),
('工装裤', 0, 2, 'ON');

INSERT INTO product_spu (name, category_id, description, status, sales, cover_url) VALUES
('经典直筒牛仔裤', 1, '经典版型，百搭耐穿', 'ON', 120, ''),
('弹力修身牛仔裤', 1, '舒适弹力，修身显瘦', 'ON', 80, ''),
('多口袋工装裤', 2, '实用多袋设计', 'ON', 60, '');

INSERT INTO product_sku (spu_id, sku_code, title, price, stock, color, size, status) VALUES
(1, 'SKU-JEANS-001', '蓝色 M', 199.00, 100, '蓝', 'M', 'ON'),
(1, 'SKU-JEANS-002', '蓝色 L', 199.00, 80, '蓝', 'L', 'ON'),
(2, 'SKU-JEANS-003', '黑色 M', 219.00, 60, '黑', 'M', 'ON'),
(2, 'SKU-JEANS-004', '黑色 L', 219.00, 40, '黑', 'L', 'ON'),
(3, 'SKU-CARGO-001', '军绿 L', 239.00, 50, '军绿', 'L', 'ON'),
(3, 'SKU-CARGO-002', '卡其 XL', 239.00, 40, '卡其', 'XL', 'ON');

INSERT INTO address (user_id, receiver, phone, province, city, district, detail, is_default)
VALUES (1, '管理员', '13800000000', '上海', '上海', '浦东新区', '世纪大道100号', 1);
