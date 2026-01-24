---
title: Sqoop自动化抽取数据与验证
date: 2020-09-12
description: 
tags: [Hive, Sqoop, Shell]
category: 数据仓库
author: 惊羽
cover: /images/bot.jpg
---
### 前言说明

最近项目业务数据源多种多样，用 Sqoop 抽取数据到数仓是一个体力活，底层又是基于 MapReduce 执行的，速度感人，关键是还得做数据校验

于是想着自己写个工具类，和自动建表建库类似，自动读取数据源表和字段信息，创建对应脚本，扔到 DolphinScheduler 上自动跑就完事。

### 基本步骤

1. 自定义工具类，读取 MySQL 中 information_schema 库下的 TABLES 表 获取同名的表

2. 获取到表名的容器，然后按照固定格式以文本形式写到 HDFS上文件夹上

3. 脚本内容需要做数据校验并将校验结果，并且加上并行执行符号

4. DolphinScheduler 上新建工作流，定期执行脚本文件

### Sqoop 数据抽取脚本

```bash
export SQOOP_HOME=/export/server/sqoop-1.4.7.bin_hadoop-2.6.0
$SQOOP_HOME/bin/sqoop import \
--connect jdbc:mysql://192.168.88.163:3306/insurance \
--username root \
--password 123456 \
--table dd_table \
--hive-table insurance_ods.dd_table \
--hive-import \
--hive-overwrite \
--fields-terminated-by '\t' \
--delete-target-dir \
-m 1

```

### Sqoop 抽取数据+数据验证

```bash
export SQOOP_HOME=/export/server/sqoop-1.4.7.bin_hadoop-2.6.0
$SQOOP_HOME/bin/sqoop import \
--connect jdbc:mysql://192.168.88.163:3306/insurance \
--username root \
--password 123456 \
--table dd_table \
--hive-table insurance_ods.dd_table \
--hive-import \
--hive-overwrite \
--fields-terminated-by '\t' \
--delete-target-dir \
-m 1

#1、查询MySQL的表dd_table的条数
mysql_log=`$SQOOP_HOME/bin/sqoop eval \
--connect jdbc:mysql://192.168.88.163:3306/insurance \
--username root \
--password 123456 \
--query "select count(1) from dd_table"
`
mysql_cnt=`echo $mysql_log | awk -F'|' {'print $4'} | awk {'print $1'}`
#2、查询hive的表dd_table的条数
hive_log=`hive -e "select count(1) from insurance_ods.dd_table"`

#3、比较2边的数字是否一样。
if [ $mysql_cnt -eq $hive_log ] ; then
echo "mysql表的数据量=$mysql_cnt,hive表的数据量=$hive_log,是相等的"
else
echo "mysql表的数据量=$mysql_cnt,hive表的数据量=$hive_log,不是相等的"
fi
```

### SqoopUtil

```sql
object SqoopUtil {
  def main(args: Array[String]): Unit = {
    createHiveTable()
  }

  def createHiveTable() = {
    //连接MySQL，读取MySQL表名有哪些字段，字段类型，字段的注释
    val table_arr = Array(
      "area",
      "policy_acuary",
      "policy_benefit",
      "policy_client",
      "policy_surrender",
    for (tablename <- table_arr) {
      //var str =
      //  s"""/export/server/sqoop/bin/sqoop import  --connect jdbc:mysql://192.168.88.163:3306/insurance  --username root  --password 123456  --table ${tablename}  --hive-table insurance_ods.${tablename}  --hive-import  --hive-overwrite  --fields-terminated-by '\\t'  -m 1 \n""".stripMargin
      var str1 =
        s"""/export/server/sqoop/bin/sqoop import  \\
           |--connect jdbc:m1ysql://192.168.88.163:3306/insurance  \\
           |--username root  \\
           |--password 123456  \\
           |--table ${tablename}  \\
           |--hive-table insurance_ods.${tablename}  \\
           |--hive-import  \\
           |--hive-overwrite  \\
           |--fields-terminated-by '\\t'  \\
           |-m 1""".stripMargin
      println(str1)
    }

  }

}
```