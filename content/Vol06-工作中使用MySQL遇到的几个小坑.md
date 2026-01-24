---
title: Vol.06 工作中使用MySQL遇到的几个小坑
date: 2023-01-15
description: 
tags: [周更挑战]
category: MySQL
author: 惊羽
cover: https://s2.loli.net/2023/01/15/FgLoEhyf589UCZN.jpg
---
![](https://s2.loli.net/2023/01/15/FgLoEhyf589UCZN.jpg)

MySQL 是工作当中经常使用到一个开源数据库，我当前工作主要使用 MySQL 作为报表存储数据库，以及承接数据提供给到下游业务使用。使用过程中遇到很多很多坑，都是小问题但是碰到了处理起来也是比较繁琐，特别记录一下。

### 分区问题

MySQL 数据库使用 InnoDB 引擎的时候是支持分区的，MySQL数据库的分区是局部分区索引，一个分区中既存了数据跟索引。聚集索引和非聚集索引都存放在分区当中。MySQL 分区分为 RANGE分区，LIST分区，HASH分区，KEY分区，生产环境一般使用RANGE分区，这个分区通常会跟 hive 数仓里面的分区字段一致，分区字段相当于索引，通常是 YYMMDD 这样的日期数据，

- 如果表设置了索引，那么分区字段必须是索引
- RANGE 分区日期字段，分区只能从小到大创建。这个在批量导入分区数据的时候需要特别特别注意，先创建分区再插入数据，其次是分区需要从小到大创建，我被这个坑了许多次。

```sql
-- 创建分区表，假设分区字段是日期,to_days() 函数作用是返回参数日期跟年份 0 之间差的天数
CREATE TABLE table_name (
user_id      INT, 
nick_name    VARCHAR(50), 
dayno        DATE   
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
 PARTITION BY RANGE(to_days(dayno)) (
 PARTITION p20230111 VALUES LESS THAN (738897),
 PARTITION p20230112 VALUES LESS THAN (738898),
 PARTITION p20230113 VALUES LESS THAN (738899),
 PARTITION p20230114 VALUES LESS THAN (738900),
 PARTITION p20230115 VALUES LESS THAN (738901)
 );

-- 新增分区
alter table table_name add PARTITION(
 PARTITION p20230116 VALUES LESS THAN (738902) ENGINE = InnoDB,

-- 删除分区
 alter table table_name drop PARTITION p20230116 ;
-- 查询当前表分区
show create table_name;

-- 或者通过查询元数据
select partition_name,table_rows
from information_schema.partitions
where table_name = 'table_name';
```

### 大小写敏感问题

MySQL 在 Windows 下不区分大小写，但在 Linux 下默认是区分大小写。MySQL 大小写敏感配置相关的两个参数，lower_case_file_system 和 lower_case_table_names。

```sql
-- 查询当前 MySQL 大小写敏感情况
show global variables like '%lower_case%';
+------------------------+-------+
| Variable_name          | Value |
+------------------------+-------+
| lower_case_file_system | ON    |
| lower_case_table_names | 2     |
+------------------------+-------+
2 rows in set (0.02 sec)

-- 如何修改
修改 MySQL 配置文件 my.cnf 当中的参数即可。
```

- lower_case_file_system

代表当前系统文件是否大小写敏感，只读参数，无法修改。ON 大小写不敏感，OFF 大小写敏感。

- lower_case_table_names，

代表表名是否大小写敏感，可以修改，参数有0、1、2三种。

- - 0 大小写敏感。
  - 1 大小写不敏感。
  - 2 大小写不敏感。跟 1 参数的区别是创建的库表名称保持原样保存在磁盘上但是执行 SQL 语句的时候会自动转换成小写。 1 参数创建的库表名称会转换成小写保存在磁盘上

### 字符集问题

通常我们创建 MySQL 表的时候都会指定字符集为 utf8，这个通用于各种工具产品，并且对中文兼容性好。但是但是，但是这个字符集不支持 emoji 符号，我在处理爬虫跟日志数据的时候，就被坑了。字符集设置为 utf8mb4，能支持更多格式并且兼容 emoji 符号存储。

- MySQL 中字符集相关变量，设置直接 set 即可

```sql
 character_set_client：客户端请求数据的字符集
 character_set_connection：从客户端接收到数据，然后传输的字符集
 character_set_database：默认数据库的字符集，
 character_set_results：结果集的字符集
 character_set_server：数据库服务器的默认字符集
 character_set_system：存储元数据的字符集,默认 utf8，不需要设置
```

### 数据类型问题

因为不同的数据库会有不同的数据类型，从 hive 数仓导入到 MySQL 数据库，尤其需要注意设置匹配的字段类型，一方面是基于兼容性考虑保证数据正常导入且没有改变，另一方适合的字段类型也能节约成本。

- 小数类型，财务精准数据，建议使用 DECIMAL 类型，指定步长避免精度损失。更建议的做法是在 hive 数仓上游就处理好步长。
- 字符串类型，建议使用可变字符串类型 VARCHAR 指定字符串长度，任何情况下都不建议使用其它的字符串类型。
- 日期类型，不包含时间使用 DATE ，包含时间使用 DATETIME，MySQL 库不建议将时间数据存储为字符串，会影响查询性能。
- 数值类型，注意不同的 INT 类型在只取整数无符号的情况能存储的最大数值范围，这个我同事经常被坑。

```sql
-- 各种 INT 类型的取值范围，在只取整数的情况下
TINYINT: (0，255)
INT: 	(0，4294967295)
BIGINT: (0，18446744073709551615)
```

### 存储过程跟函数

MySQL 支持自定义函数跟存储过程，通常来说存储过程会比函数功能更强大，比如有修改全局数据库状态的权限，可以返回参数，能做为独立程序执行，而函数通常作为查询语句的一部分来使用，有严格的限制。日常工作中我使用并没有经常使用到自定义函数，但是经常使用存储过程，主要用于检测 MySQL 分区状态，创建、清空、删除分区等操作，因为自定义程度很高，基本能和脚本语言编写的判断程序达到一样的效果。

- 创建一个存储过程的格式

```sql
CREATE
    [DEFINER = { user | CURRENT_USER }]
　PROCEDURE sp_name ([proc_parameter[,...]])
    [characteristic ...] routine_body
 
proc_parameter:
    [ IN | OUT | INOUT ] param_name type
 
characteristic:
    COMMENT 'string'
  | LANGUAGE SQL
  | [NOT] DETERMINISTIC
  | { CONTAINS SQL | NO SQL | READS SQL DATA | MODIFIES SQL DATA }
  | SQL SECURITY { DEFINER | INVOKER }
 
routine_body:
　　Valid SQL routine statement
 
[begin_label:] BEGIN
　　[statement_list]
　　　　……
END [end_label]
```

### 参考资料

https://www.cnblogs.com/GrimMjx/p/10526821.html

https://www.jianshu.com/p/f2eabcef6577

https://blog.csdn.net/qq_43563999/article/details/105820952

https://www.runoob.com/w3cnote/mysql-stored-procedure.html
