---
title: hive性能优化
date: 2021-05-20
description: 
tags: [Hive]
category: 数据仓库
author: 惊羽
cover: /images/hive2.jpg
---
## 基础优化

- Shuffle 阶段压缩
- hive的数据压缩
    - Snappy
- hive的数据存储格式
    - ORC
    - TextFile
- fetch抓取
- 本地模式
- join的优化
    - 小表在前，小表放入缓冲区
    - 谓词下推，先过滤再 join
- SQL优化的方案
    - 列裁剪
    - 分区裁剪
    - group by 优化
    - count（distinct）优化
- 动态分区调整
- 并行编译执行
- 严格模式
    - 拒绝可能影响效率的 SQL 语句
- jvm的重用
- 推测执行
- 小文件合并
- 矢量化查询
- 读取零拷贝
- 关联优化器
    - 多个MR共享使用一个shuffle结果

## Join 优化

### map join

- 核心
    - 将某个符合条件的表放置在内存中, 然后和另一个在map端进行join工作
- 解决问题
    - 1.数据倾斜问题
    - 2.提升查询的效率
- 适用场景
    - 小表和大表join场景
- 使用条件
    - 1.必须有一张表为小表
        - set hive.auto.convert.join.noconditionaltask.size=512000000
        - 设置小表最大数据量,默认值为 20M
    - 2.必须开启map Join优化支持
        - set hive.auto.convert.join=true; 默认就是true
    - 3.不限制任何类型的表

### bucket map join

- 适应场景
    - 中型表 和 大表 join
- 使用条件
    - 1.开启bucket map join: set hive.optimize.bucketmapjoin = true;
    - 2.一个表的bucket数是另一个表bucket数的整数倍
    - 3. bucket列 == join列
    - 4.必须是应用在map join的场景中
    - 5.两个表必须是分桶表

### SMB map join

- 适应场景
    - 大表 和 大表join
- 使用条件
    - 1.开启bucket map join: set hive.optimize.bucketmapjoin = true;
    - 2.两个表的分桶数量是一致的
    - 3.bucket列 == join列 == sort列
    - 4.必须是应用在bucket map join的场景中
    - 5.两个表必须是分桶表
- 整理SMB条件
    - 1) 保证 join的表必须是桶表:
        - set hive.enforce.bucketing=true; 写入数据强制分桶
    - 2) 在建表的时候, 必须设置分桶排序字段, 而且需要保证, 分桶字段 == join字段 == 排序字段create table test_smb_2( mid string, age_id string ) CLUSTERED BY(mid) SORTED BY(mid) INTO 500 BUCKETS; set hive.enforce.sorting=true; -- 开启强制排序操作
    - 3) 两个分桶表的分桶的数量必须是一致的
    - 4) 必须建立在bucket map join基础上:
        - set hive.optimize.bucketmapjoin = true;
    - 5) 开启SMB join支持
        - set hive.auto.convert.sortmerge.join=true;
        - set hive.auto.convert.sortmerge.join.noconditionaltask=true;
    - 6) 必须开启自动尝试SMB连接
        - set hive.optimize.bucketmapjoin.sortedmerge = true;

## 索引优化

### 核心思想

- 减少最终数据的扫描量, 从而提高效率

### 原始索引

- 特点
    - 可以针对hive表中任意字段构建索引
    - 构建索引后, 在查询数据时候, 根据索引查询, 减少MR读取数据扫描量
- 弊端
    - 索引不能自动更新, 当表中数据发生变更后, 需要手动重建索引
    - 此性能是一般(数据量越大, 性能越差)
- 应用场景
    - 生产中一般不采用原始索引
    - 在hive3.0版本后, 不支持hive原始索引

### 行组索引row group index

- 特点
    - 一旦开启后, 会将表的每一个字段的最小 最大值都放置在索引中
- 使用条件
    - 1.必须应用在表结构为ORC类型
    - 2.在插入数据的时候, 要保证后续需要索引的字段, 是有序插入的
    - 3.行组索引主要是应用在数值类型的字段上
    - 4.在创建表的时候, 必须开启 行组索引
        - 'orc.create.index'='true'
    - 5. 开启hive自动使用索引(CM)
        - hive.optimize.index.filter=true
- 应用场景
    - 主要是应用 数值类型字段上, 并且执行 > < >= <= = 相关的操作中
- 使用方案
    - 1.在建表的时候, 需要开启行组索引CREATE TABLE lxw1234_orc2 ( 字段 ....)stored AS ORCTBLPROPERTIES( 'orc.compress'='SNAPPY',- 开启行组索引 'orc.create.index'='true')
    - 2.在向表中插入数据的时候, 保证对应需要索引的列 进行有序插入

### 开发过滤索引Bloom Filter index

- 说明
    - 将需要构建索引的字段的值, 在索引信息(script)中进行放置
    - 当查询的时候, 根据索引字段查询, 首先会先查询这个script索引信息中, 是否包含这个值
    - 如果包含, 直接查询这个script片段, 如果不包含, 直接跳过
- 使用条件
    - 1.必须应用在表结构为ORC类型
    - 2.在建表的时候, 需要指定为那些字段构建开发过滤索引:
        - 'orc.bloom.filter.columns'='pcid,字段2, 字段3'
    - 3.必须要应用在 等值连接场景中 (不局限数据类型)
- 应用场景
    - 应用在等值连接场景(不限制数据类型)
- 使用方案
    - 1.需要开启行组索引
    - 2.指定字段开启BloomFilter索引CREATE TABLE lxw1234_orc2 ( 字段) stored AS ORCTBLPROPERTIES( 'orc.compress'='SNAPPY', 'orc.create.index'='true',- pcid字段开启BloomFilter索引 "orc.bloom.filter.columns"="pcid")

### 总结索引使用方法

- 行组索引建议常开
    - 在查询过程中, 如果正常插入数据是有序的, 并且根据这个字段查询操作
    - 自动使用行组索引, 从而提升效率, 而且增加行组索引, 不会导致太多冗余数据出现
- 开发过滤索引看需求
    - 将后续会经常的进行等值连接的字段, 构建为开发过滤的索引
    - 需要大家有一定的预判能力

## 数据倾斜问题

### join 的数据倾斜

- 方案1: 采用 map join
- 方案2: 将数据倾斜的key单独找一个MR处理,最后合并结果
    - 运行期解决
        - 说明
            - 知道一定有数据倾斜, 但是不知道哪一个key会有数据倾斜
        - 处理思路
            - 在运行的过程中, 对每个key的数量进行计数, 当发现key对应的value的条数比较大的时候, 认为key出现了数据倾斜问题
            - 将整个键值从当面MR移出去, 单独找一个MR来处理
        - 配置方式
            - set hive.optimize.skewjoin=true;
            - 开启运行期数据倾斜的处理,默认为FALSE
            - set hive.skewjoin.key=100000;
            - 当key数据量到达多少的时候, 认为出现数据倾斜
    - 编译期解决
        - 说明
            - 提前知道哪个key会出现数据倾斜
        - 处理思路
            - 创建表的时候, 提前指定那个key会出现数据倾斜
            - 后期执行操作的时候hive会在编译期将key单独移出去, 单独找一个MR运行
        - 配置方式
            - 配置参数
                - set hive.optimize.skewjoin.compiletime=true;
                - 是否开启编译期数据倾斜解决
            - 创建表的参数
                - SKEWED BY (key) ON (1,5,6)
                - 倾斜的字段和需要拆分的key值
                - [STORED AS DIRECTORIES];-
                - 为倾斜值创建子目录单独存放
    - 开启MR合并优化
        - 说明
            - 两个MR执行完成后, 直接将数据写入到最终目录下, 直接作为最终结果
            - 建议和join倾斜的配置同时开启
        - 设置参数
            - set hive.optimize.union.remove=true;
            - 开启对union的优化配置
    - 生产环境做法
        - 两个组合使用, 提前知道提前定义好, 不知道的采用运行期解决, 达到效率最高
        - 并且可以解决所有的join倾斜问题

### group by 的数据倾斜

- 说明
    - 当某一个的数据量远远大于其它组的数据量, 这个时候就容易出现数据倾斜
- 解决方案
    - 方案1: 小的combiner操作
        - 说明
            - 利用规约提前处理k2v2
        - 设置参数
            - hive.map.aggr=true;
            - 开启map端的combiner操作
    - 方案2:负载均衡策略(大的combiner)
        - 说明
            - 利用2个MR来解决, 第一个MR负责将数据打散,保证每一个reduce都能接收到大致相等的数据量
            - 得出一个局部结果,第二个MR对局部结果进一步处理,得出最终结果(自定义分区)
        - 设置参数
            - hive.groupby.skewindata=true;
            - 开启groupby负载均衡 默认为FALSE
    - 注意事项
        - 在多个列上进行的去重操作与hive环境变量 hive.groupby.skewindata 存在冲突。
    

### 如何判断执行的SQL存在数据倾斜

- 1.查看MR日志,对比reduce执行时间
- 2.运行过程中,通过HUE来观察

### 参考资料

HiveSQL优化方法与实践（全）

[https://mp.weixin.qq.com/s/C8236cW8E4HMwox-UJFrgA](https://mp.weixin.qq.com/s/C8236cW8E4HMwox-UJFrgA) 

原来 8 张图，就可以搞懂「零拷贝」了！

[https://mp.weixin.qq.com/s/P0IP6c_qFhuebwdwD8HM7w](https://mp.weixin.qq.com/s/P0IP6c_qFhuebwdwD8HM7w)