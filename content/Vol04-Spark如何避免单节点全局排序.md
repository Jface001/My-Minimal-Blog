---
title: Vol.04 Hive / Spark 如何避免单节点全局排序？
date: 2023-01-02
description: 
tags: [周更挑战, Spark, Hive]
category: 日常工作
author: 惊羽
cover: /images/17736140_D6hZklc1OntfFdJ.jpg
---
![](/images/17736140_D6hZklc1OntfFdJ.jpg)



最近因为经常对接模型算法，营销模型的一个应用场景是：按照模型打分取 TOPN 用户进行营销投放，由此就会产生一个全局排序的场景：**在用户量过亿的情况下，单点全局排序极其容易出现 OOM。**经历了几次线上事故之后，决心要彻底解决这个问题，跟同事请教了下，可以通过 **“加盐打散”** 来解决这个问题。

### 加盐打散

产生全局排序的原因就是因为所有的 key 都需要互相比较才能产生全局排序序号，加盐打散的思路就是：**通过对 key 加盐之后，拆分成不同的分组，用分组排序代替全局排序，实现分布式全局排序。**就拿我日常接触最多的用户模型打分来说，基本思路如下：

```plain
1、对用户加盐进行分组，并且获取不同组的先后顺序跟用户在组内的排序
2、获取每个组的全局初始排序
3、每个用户的全局排序 = 分组初始排序 + 在组内的排序 
```

### 参考代码

假设有表 model_score ，字段有 user_id 跟 score ，里面有 10 亿条数据，结构如下，要对表里所有的 user_id 按照 score 大小排序。

```sql
CREATE TABLE IF NOT EXISTS `model_score`(
   `user_id` VARCHAR(100) NOT NULL,
   `score` DOUBLE NOT NULL
)ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

- 对用户加盐进行分组，获取用户在组内的排序

```sql
with t1 as (
select 
  user_id
  ,score
  ,new_score
  row_number() over(partition by new_score order by score desc) as rank1 -- 获取用户分组内排序
  from (
  select user_id,score,ceil(score*10000) as new_score
  from model_score
  ) tmp
),
```

- 获取每个分组全局初始排序

```sql
t2 as (
select 
new_score
,sum(cnt) over(order by new_score desc rows between unbounded preceding and 1 preceding ) as rank2 
  -- 从负无穷行到当前 -1 行的求和，获取到该分组用户最初的全局排序
from ( 
select new_score,count(1) as cnt
from t1 
group by new_score
) tmp 
  ),
```

- 合并获取到用户的全局排序

```sql
select 
t1.user_id
,t1.score 
,(t1.rank1 + t2.rank2) as rank   -- 每个用户的全局排序 = 分组初始排序 + 在组内的排序 
from t1 
left join t2 on t1.new_score = t2.new_score 
```

