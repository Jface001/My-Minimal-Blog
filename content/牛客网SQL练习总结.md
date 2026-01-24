---
title: 牛客网SQL练习总结
date: 2021-02-13
description: 
tags: [MySQL, SQL]
category: 面试准备
author: 惊羽
cover: /images/nowcoder.jpg
---
## 补充知识

### 补充知识整理

```sql
1.一张表可以多次被引用使用
2.筛选条件包含某个值, 这个值可以通过子查询求出, 再通过 where 条件判断
3.子查询没有符合要求的条件会直接返回 null
4.insert ignore into 相当于 replace
5.创建视图格式:  create view actor_name_view as + 字段列表(查询结果等)
6.查询强制走索引: from 表名 + force index(索引名)
7.创建表字段后+ default '默认值', 即赋予默认值
8.如果需要对数据进行更新操作, 一定是通过update 或者 replace 进行
9.需要排除最大值最小值再进行计算的题目,可以通过子查询排除, 或者通过 first_value last_value 开窗函数进行
10.exsits 用来判断是否存在某种条件的记录，存在就返回 true ,不存在则返回 false
11.第 1 的隐含条件是 该字段数值大于 它的数量为 0 , 大于等于它的数量为 1 , 以此类推
12.聚合字段的部分值，可以让其它值为0，为null，聚合的时候不影响结果

```

### 非空校验方法

```sql
--如果x为null，就返回y，否则返回x
nvl(x,y)
--返回集合中第一个不为null的值，如果全部为null就返回null
colease(x,y,e,d,f)
--如果x为null，就返回y，否则返回x
ifnull(x,y)
```

### 创建和删除索引

[SQL37 对first_name创建唯一索引uniq_idx_firstname](https://www.nowcoder.com/practice/e1824daa0c49404aa602cf0cb34bdd75)

```sql
-- MySQL中4种方式给字段添加索引

-- 创建主键索引,索引值必须是唯一的，且不能为NULL。
ALTER TABLE tbl_name ADD PRIMARY KEY (col_list);

-- 创建唯一索引,值唯一
ALTER TABLE tbl_name ADD UNIQUE index_name (col_list);

-- 创建普通索引,索引值可以重复出现
ALTER TABLE tbl_name ADD INDEX index_name (col_list);

-- 创建全文索引, 指定索引
ALTER TABLE tbl_name ADD FULLTEXT index_name (col_list);

-- 删除索引
DROP INDEX index_name ON tbl_name;
ALTER TABLE tbl_name DROP INDEX index_name；
ALTER TABLE tbl_name DROP PRIMARY KEY;

```

### 触发器

```sql
在MySQL中，创建触发器语法如下：
CREATE TRIGGER trigger_name
trigger_time trigger_event ON tbl_name
FOR EACH ROW
trigger_stmt
其中：

trigger_name：标识触发器名称，用户自行指定；
trigger_time：标识触发时机，取值为 BEFORE 或 AFTER；
trigger_event：标识触发事件，取值为 INSERT、UPDATE 或 DELETE；
tbl_name：标识建立触发器的表名，即在哪张表上建立触发器；
trigger_stmt：触发器程序体，可以是一句SQL语句，或者用 BEGIN 和 END 包含的多条语句，每条语句结束要分号结尾。
```

[SQL41 构造一个触发器audit_log](https://www.notion.so/7e920bb2e1e74c4e83750f5c16033e2e)

```sql
create trigger audit_log
after insert on employees_test
for each row
begin
insert into audit values(new.id,new.name);
end
```

### 窗口函数

- 窗口函数完整模式

```sql
-- 指定字段求和并排序，窗口范围所有行
sum(x) over(partition by a order by b  rows between unbounded preceding  and unbounded following )
-- 指定字段求和并排序，窗口范围是从改值前面的行到当前行
sum(x) over(partition by a order by b  rows between unbounded preceding  and current row )
-- 指定字段求和并做排序，将所有行当前字段数据中，当前行值+2 和 -2范围之内的所有值求和 
sum(x) over(partition by a range between 2 preceding  and 2 followling )
```

- 常用窗口函数

```sql
-- 排名窗口函数
row_number()
rank()
dense_rank()

-- 聚合窗口函数
sum 求和
count 总数
max 最大值
min 最小值
avg 平均值

--其它窗口函数
lag 上一行的值
lead 下一行的值
first_value 该字段第一行的值
last_value 该字段最后一行的值
```

### 其它常用函数

```sql

concat(字符1, 连接符,字符2) 指定连接符连接字符 1 和字符 2

group_concat（X，Y）
X是要连接的字段，
Y是连接时用的符号，可省略，默认为逗号。
此函数必须与group by 配合使用。

统计字符串长度：
char_length('string') / char_length(column_name)
1、返回值为字符串string或者对应字段长度，长度的单位为字符，一个多字节字符（例如，汉字）算作一个单字符；
2、不管汉字还是数字或者是字母都算是一个字符；
3、任何编码下，多字节字符都算是一个字符；
参考资料来源：https://blog.csdn.net/iris_xuting/article/details/53763894

length('string')/length(column_name)
1、utf8字符集编码下,一个汉字是算三个字符,一个数字或字母算一个字符。
2、其他编码下,一个汉字算两个字符, 一个数字或字母算一个字符。

字符串替换：replace(s,s1,s2)，将字符串 s2 替代字符串 s 中的字符串 s1
MySQL常用函数：https://www.runoob.com/mysql/mysql-functions.html

截取字符串函数 substr(X,Y,Z) 或 substr(X,Y) 
X是要截取的字符串 
Y是字符串的起始位置
Z是要截取字符串的长度

left 和 right 函数切割，后面 left(a,7) a是要切割的字符串，7是切割位数

date_sub(date,expr) date/datetime 减去expr 值后返回对应 date/datetime                   

```

## 求排名

### 求排名第N个的

[SQL2 查找入职员工时间排名倒数第三的员工所有信息](https://www.nowcoder.com/practice/ec1ca44c62c14ceb990c3c40def1ec6c)

```sql
-- 方法1:先求出排名求第N个, 再倒排
select *
from (select *
from employees
order by hire_date desc
limit 0,3) e
order by e.hire_date
limit 1;

-- 方法2:子查询,排名字段比自己高大于N的即可, 缺点是如果数据少于排名就不能求出
select * 
from employees e1
where 2=(select count(*) from employees e2 where e1.hire_date < e2.hire_date);

-- 方法3:子查询, 比排名N+1中最高的就是第N个

-- 方法4:开窗函数，不计算重复就用row_number ，统计重复就dense_rank，子查询 <=N 即可。

```

### 求某个分组里面排名第N个

[SQL12 获取每个部门中当前员工薪水最高的相关信息](https://www.nowcoder.com/practice/4a052e3e1df5435880d4353eb18a91c6)

```sql
-- 1.窗口函数求出每个成员在分组里面的排名
-- 2.子查询让排名等于N
-- 3.可以做个非空校验, 如果没有符合的的rank, 就返回指定值.

select 
dept_no,emp_no,salary as maxSalary
from(
select d.dept_no,d.emp_no,s.salary,row_number() over(partition by d.dept_no order by s.salary desc)  as r1
from dept_emp d, salaries s
where d.emp_no =s.emp_no) ss
where r1=1
order by dept_no;
```

## 用户登陆相关

### 最近登陆日期

[SQL67 牛客每个人最近的登录日期(二）](https://www.nowcoder.com/practice/7cc3c814329546e89e71bb45c805c9ad)

```sql
--基本思路就是求出最近登陆的日期和 user_id 作为字典表，里面对应的user_id 就是最近登陆的用户，查询即可。

select u.name,c.name,l.date
from login l, user u , client c
where l.user_id=u.id and l.client_id=c.id
and (l.user_id,l.date) in(select user_id,max(date) from login group by user_id)
order by u.name;
```

### 次日留存率

[SQL68 牛客每个人最近的登录日期(三)](https://www.nowcoder.com/practice/16d41af206cd4066a06a3a0aa585ad3d)

```sql
-- 1.筛选出初次登陆的新用户
select user_id,min(date)
from login 
group by user_id;

--2.新用户登陆后, 第二天登陆的情况

select round(count(distinct user_id) / (select count(distinct user_id) from login) ,3) as p
from login
where (user_id,date) in (select user_id,date_add(min(date),INTERVAL 1 day) from login group by user_id)
```

### 每日新增用户数

[SQL69 牛客每个人最近的登录日期(四)](https://www.nowcoder.com/practice/e524dc7450234395aa21c75303a42b0a)

```sql
--1.求出新用户登陆日期
select user_id,min(date) as date 
from login 
group by user_id;

--2.通过case when 判断, 如果当天登陆用户中和新用户登陆表相同则记为1,否则是0.
select tmp.date,sum(tmp.t) as new
from
(select date,
case 
when (user_id,date) in 
(select user_id,min(date) as date 
from login 
group by user_id) 
then 1
else 0
end as t
from login) tmp
group by date
order by date;
```

### 新用户次日留存率

[SQL70 牛客每个人最近的登录日期(五)](https://www.nowcoder.com/practice/ea0c56cd700344b590182aad03cc61b8)

```sql
--分子:当前日期+ 1day 中是前一天新用户的用户
--分母 当前日期中是新用户, 即当前日期是该用户所有登陆日期中最小的
--当前日期-1day =date   等于 当前日期= date + 1day

select date,
ifnull(round (
sum(case when (user_id,date) in (select user_id, min(date) from login group by user_id) 
 and (user_id,date) in (select user_id, date_add(date,interval -1 day) from login group by user_id) 
then 1
else 0
end)
  /
sum(case when (user_id,date) in (select user_id, min(date) from login group by user_id)
then 1
else 0
end),
  3),0)as p
from login
group by date
order by date;
```

### 用户登陆并统计核心行为统计

[SQL71 牛客每个人最近的登录日期(六)](https://www.nowcoder.com/practice/572a027e52804c058e1f8b0c5e8a65b4)

```sql
-- 1.先求出每个用户登陆时候的刷题信息和姓名
-- 2.根据日期排序, 再根据姓名排序
-- 3.题目是求到某一天累计刷题多少, 我们可以通过子查询筛选符合的
select p1.user_id,p1.date,sum(p1.number) as number
from passing_number p1,passing_number p2
where  p1.user_id=p2.user_id and p1.date>=p2.date
group by p1.user_id,p1.date;

-- 最终SQL
select
u.name,p.date,p.number
from login l,(select p1.user_id,p1.date,sum(p2.number) as number
from passing_number p1 
left join passing_number p2
on  p1.user_id=p2.user_id and p1.date>=p2.date
group by p1.user_id,p1.date) p ,user u 
where l.user_id=p.user_id and l.date=p.date and l.user_id=u.id
order by p.date,u.name;
```

### 求连续登陆N天的用户

```sql

--求连续三天登录的人数的方法
create or replace temporary view mytab as
select 'zs' name, '2021-08-01' logintime union all
select 'zs' name, '2021-08-02' logintime union all
select 'zs' name, '2021-08-03' logintime union all
select 'zs' name, '2021-08-04' logintime;

--思路一，将having count(1)>=n，就是求连续n天登录的人数
--连续三天登陆等于登陆日期-登陆的次数排序=第一天登陆
with t1 as ( select distinct name,logintime from mytab),
     t2 as ( select *,
                    date_sub(logintime,row_number() over (partition by name order by logintime)) as temp_date
             from t1 )
select count(distinct name) cnt
from t2
group by name, temp_date
having count(1)>=3
;
--思路二，将下面的date_add(logintime,n-1)，lead(logintime,n-1) ，就是求连续n天登录的人数
with t1 as ( select distinct name,logintime from mytab),
     t2 as ( select *,
                    date_add(logintime,2) as expectdate,
                    lead(logintime,2) over (partition by name order by logintime) realdate
             from t1 )
select count(distinct name) cnt  from t2 where expectdate=realdate
;
```

## 中位数相关

### 求中位数

[考试分数（四）](https://www.nowcoder.com/practice/502fb6e2b1ad4e56aa2e0dd90c6edf3c)

```sql
--需求
--请你写一个sql语句查询各个岗位分数升序排列之后的中位数位置的范围，并且按job升序排序

--补充知识
--中位数的特征：
--当个数为偶数时，中位数的起始位置等于个数/2，结束位置等于个数/2+1
--当个数为奇数时，中位数的起始位置等于向上取整（个数/2），结束位置等于向上取整（个数/2）
--用除以2的余数是否为0来判断奇偶，%2=0
--记得取整数，本题用ceiling函数向上取整（返回不小于该数的最小整数值）或round(数，0)四舍五入取整都可以

--我的写法
SELECT
job,
ceil(count(id)/2) as start,
case 
when count(id)%2=0
then ceil(count(id)/2+1)
else ceil(count(id)/2)
end as end
from grade
group by job
order by job;

# 大神简化版 ,后面的+1再除以2, 
select job, round(count(id)/2), round((count(id)+1)/2)
from grade 
group by job
order by job;
```

### 求中位数以上的情况

[考试分数（五）](https://www.nowcoder.com/practice/b626ff9e2ad04789954c2132c74c0512)

```sql
--需求
--请你写一个sql语句查询各个岗位分数的中位数位置上的所有grade信息，并且按id升序排序

--1.先求出中位数范围
--2.再通过开窗函数求出每个同学分数的自然排名
--3.按照id排序

SELECT
tmp.id,tmp.job,tmp.score,tmp.t_rank
from(
SELECT id,job,score,
  row_number() over (partition by job order by score desc) t_rank,
  count(score) over (partition by job) as cnt
  from grade) as tmp
  where tmp.t_rank=floor((tmp.cnt+1)/2) or tmp.t_rank=floor((tmp.cnt+2)/2)
  order by tmp.id;
```