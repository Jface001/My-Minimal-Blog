---
title: Hbase 无法删除表问题及解决办法
date: 2021-03-20
description: 
tags: [Hbase, Linux]
category: Debug记录
author: 惊羽
cover: /images/hbase.jpg
---
### 问题描述

- 正常删除表格的方法

```bash
# 禁用表
disable "TRIPDB:trip_sample"

# 删除表
drop "TRIPDB:trip_sample"
```

但是操作过程中出现如下的问题

- 已经禁用表

```bash
hbase(main):005:0> disable "TRIPDB:trip_sample"

ERROR: Table TRIPDB:trip_sample is disabled!

For usage try 'help "disable"'

Took 0.1485 seconds
```

- 但是无法删除表，删除报错，死循环

```bash
hbase(main):004:0> drop "TRIPDB:trip_sample"

ERROR: Table org.apache.hadoop.hbase.TableNotDisabledException: Not DISABLED; tableName=TRIPDB:trip_sample, state=ENABLING
        at org.apache.hadoop.hbase.master.HMaster.checkTableModifiable(HMaster.java:2517)
        at org.apache.hadoop.hbase.master.procedure.DeleteTableProcedure.prepareDelete(DeleteTableProcedure.java:241)
        at org.apache.hadoop.hbase.master.procedure.DeleteTableProcedure.executeFromState(DeleteTableProcedure.java:89)
        at org.apache.hadoop.hbase.master.procedure.DeleteTableProcedure.executeFromState(DeleteTableProcedure.java:56)
        at org.apache.hadoop.hbase.procedure2.StateMachineProcedure.execute(StateMachineProcedure.java:189)
        at org.apache.hadoop.hbase.procedure2.Procedure.doExecute(Procedure.java:850)
        at org.apache.hadoop.hbase.procedure2.ProcedureExecutor.execProcedure(ProcedureExecutor.java:1473)
        at org.apache.hadoop.hbase.procedure2.ProcedureExecutor.executeProcedure(ProcedureExecutor.java:1241)
        at org.apache.hadoop.hbase.procedure2.ProcedureExecutor.access$800(ProcedureExecutor.java:75)
        at org.apache.hadoop.hbase.procedure2.ProcedureExecutor$WorkerThread.run(ProcedureExecutor.java:1761)
 should be disabled!

For usage try 'help "drop"'

Took 0.7635 seconds                                                                                                                                                  
hbase(main):005:0> disable "TRIPDB:trip_sample"

ERROR: Table TRIPDB:trip_sample is disabled!

For usage try 'help "disable"'
```

### 产生原因

1、未开启 Zookeeper 就开启 Hbase 创建表，元数据没有同步到 ZK

2、 disable  tableName 命令执行未完成就删除 Hbase， 以至于表格被锁定

3、数据输入过大，HMaster 崩溃

### 解决办法

- 删除 Hbase 对应表格元数据

```bash
scan "hbase:meta"

# 找到要删除的表格的 rowkey
                                                                                                                                              
TRIPDB:trip_sample                               column=table:state, timestamp=1632540393079, value=\x08\x03                                                                                    
 TRIPDB:trip_sample,,1632540392481.c3d71389e53809 column=info:regioninfo, timestamp=1632540396531, value={ENCODED => c3d71389e538092c4eda1b01b5a0a441, NAME => 'TRIPDB:trip_sample,,1632540392481
 2c4eda1b01b5a0a441.                              .c3d71389e538092c4eda1b01b5a0a441.', STARTKEY => '', ENDKEY => ''}                                                                             
 TRIPDB:trip_sample,,1632540392481.c3d71389e53809 column=info:sn, timestamp=1632540396531, value=node1,16020,1632540299845                                                                       
 2c4eda1b01b5a0a441.                                                                                                                                                                             
 TRIPDB:trip_sample,,1632540392481.c3d71389e53809 column=info:state, timestamp=1632540396531, value=OPENING                                                                                      
 2c4eda1b01b5a0a441.

# 也可以通过报错查看 rowkey
scan "TRIPDB:trip_sample"

```

```bash
# 根据 rowkey 删除整行数据
deleteall 'hbase:meta',"TRIPDB:trip_sample,,1632540392481.c3d71389e53809"
```

- 删除 Zookeeper 中的表格元数据，在 table  和 table-lock 中

```bash
# 登陆Zookeeper 客户端
bin/zkCli.sh

# 删除对应表格元数据
ls /hbase/table
ls /hbase/table-lock
rmr /hbase/table
rmr /hbase/table-lock

```

- 删除 HDFS 上对应数据

```bash
hdfs dfs ls /hbase/data/TRIPDB/
hdfs dfs rm -r /hbase/data/TRIPDB/trip_sample
```

- 修复 Hbase 元数据

```bash
#命令行执行
hbase hbck -fixMeta 
```

- 重启 ZK 和 Hbase

```bash
# 关闭
bin/zkServer.sh stop
bin/stop-hbase.sh stop

# 重启
bin/zkServer.sh start
bin/stop-hbase.sh start

```