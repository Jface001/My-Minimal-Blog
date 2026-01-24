---
title: Vol.24 hive 跟 clickhouse 的 TTL 机制
date: 2023-05-21
description: 
tags: [SQL, Hive, ClickHouse]
category: 日常工作
author: 惊羽
cover: https://s2.loli.net/2023/05/21/lP8Suqn4pGEzkUT.png
---
![](https://s2.loli.net/2023/05/21/lP8Suqn4pGEzkUT.png)

> 本文由 chatGPT 生成，可能存在一定错误，请读者自行甄别。

Hive和ClickHouse都支持TTL（Time-To-Live）机制，可以帮助用户自动管理表的生命周期，包括数据的删除和归档等操作。下面将分别介绍Hive和ClickHouse的TTL机制。

## Hive的TTL机制

在Hive中，可以通过设置表的TBLPROPERTIES属性来配置表的TTL。具体步骤如下：

1. 创建表时，可以通过添加TBLPROPERTIES属性来配置表的TTL，例如：



```sql
CREATE TABLE test_table (
  id INT,
  name STRING
) 
TBLPROPERTIES ("hive.enforce.bucketing"="true", "hive.exec.dynamic.partition.mode"="nonstrict", "hive.exec.dynamic.partition"="true", "hive.enforce.sorting"="true", "hive.enforce.bucketmapjoin"="true", "hive.support.concurrency"="true", "hive.txn.manager"="org.apache.hadoop.hive.ql.lockmgr.DbTxnManager", "transactional"="true", "transactional_properties"="default", "transactional_properties"="insert_only", "transactional_properties"="delete", "transactional_properties"="ttl", "transactional_properties.ttl"="14d");
```

其中，"transactional_properties"属性用于开启事务和TTL机制，"transactional_properties.ttl"属性用于设置表的TTL，单位为天。

1. 当数据的TTL到期时，Hive将自动删除数据。如果需要保留数据并将其移动到归档表中，可以使用表的移动操作。例如，可以创建一个归档分区，并将过期的数据移动到该分区中，例如：

```sql
ALTER TABLE test_table ADD PARTITION (dt='202201') LOCATION '/user/hive/archive/test_table/dt=202201';
```



其中，LOCATION属性用于指定归档分区的存储路径。

需要注意的是，Hive的TTL机制是基于时间的，只能执行预定义的操作，不能根据实际情况进行灵活调整。因此，在使用TTL机制时，需要根据实际情况进行配置，并在必要时手动执行相应的操作。

## ClickHouse的TTL机制

在ClickHouse中，可以通过设置表的ENGINE属性来配置表的TTL。具体步骤如下：

1. 创建表时，可以通过添加ENGINE属性来配置表的TTL，例如：

```sql
CREATE TABLE test_table (
  id INT,
  name STRING
) ENGINE =MergeTree()
TTL toDate(addMonths(toDate(now()), -1));
```

其中，TTL属性用于设置表的TTL，可以基于时间或基于事件进行配置。在上述示例中，TTL属性设置为一个月，表示当数据超过一个月时，ClickHouse将自动删除数据。

1. 当数据的TTL到期时，ClickHouse将自动删除数据。如果需要保留数据并将其移动到归档表中，可以使用表的移动操作。例如，可以创建一个归档表，并将过期的数据移动到该表中，例如：

```sql
CREATE TABLE archive_table (
id INT,
name STRING
) ENGINE = MergeTree()
ORDER BY id;
ALTER TABLE test_table MOVE TO archive_table
WHERE toDate(create_time) < toDate(addMonths(toDate(now()), -1));
```

其中，MOVE TO操作用于将符合条件的数据移动到归档表中，该操作只会移动数据，不会删除原始表中的数据。需要注意的是，MOVE TO操作会锁定原始表和归档表，因此需要在合适的时间执行。

需要注意的是，ClickHouse的TTL机制支持更多的声明周期选项，并且可以基于事件进行配置，具有更高的灵活性。但是，需要谨慎配置声明周期选项，以避免误删或误移数据。另外，ClickHouse的TTL机制可以与分区一起使用，更加灵活地管理数据的生命周期。
