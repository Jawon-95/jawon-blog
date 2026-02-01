# MySQL 常用命令总结

### 常用命令

```sql
-- 注意：sql 语句末尾要加分号

-- 查看当前有哪些数据库
SHOW DATABASES;

-- 创建数据库
CREATE DATABASE database001;

-- 使用某个数据库
USE databaseName;
 
-- 查看当前数据库中有哪些表
SHOW TABLES;

-- 创建表(名为 players)
CREATE TABLE players(
  id INT PRIMARY KEY AUTO_INCREMENT,  -- PRIMARY KEY 表示唯一索引, AUTO_INCREMENT 表示自动递增
  name VARCHARACTER(100),
  pw VARCHARACTER(100),
  data TEXT
);

-- 删除表
DROP TABLE players;

-- 修改表
-- 将表 players 中的 name 列的字符串长度改成 200
ALTER TABLE players MODIFY COLUMN name VARCHARACTER(200);
-- 将表 players 中的列名 name 改成 name_1
ALTER TABLE players RENAME COLUMN name to name_1;
-- 为表 players 添加 time 列
ALTER TABLE players ADD COLUMN time TIMESTAMP;
-- 从表 players 中删除 time 列
ALTER TABLE players DROP COLUMN time;

-- 查看表结构
DESC players

-- 插入数据
-- 在 players 中插入一行数据
INSERT INTO players (id, name, pw, data) VALUES (0, "Jawon", "123456", "hi");
-- 一次插入多条数据
INSERT INTO players (id, name, pw, data) VALUES 
(2, "jine", "123456", "hi"), (2, "kally", "123456", "hi"), (2, "lily", "123456", "hi");

-- 删除数据
-- 从 players 表中删除 name 为 "lily" 的数据
DELETE FROM players WHERE name = "lily"

-- 修改数据
-- 将 players 表中 name 为 Jawon 的数据中的 data 改为 "hello"
UPDATE players set data="hello" WHERE name = "Jawon";
-- 注意，删除和修改数据时不加 where 条件非常危险，会修改所有数据

-- 查询数据
SELECT * FROM players;  -- 查询此表中的所有数据
SELECT * FROM players WHERE name = "Jawon";  -- 查询 name 等于 Jawon 的数据

-- 退出 mysql
exit

```

### MySQL 数据库权限转移

```sql
-- 将创建数据库权限交给已有用户，之后刷新权限
GRANT ALL PRIVILEGES ON feeder.* TO 'psl'@'%';
FLUSH PRIVILEGES;

-- 查看用户权限
SHOW GRANTS FOR 'psl'@'%';
```
