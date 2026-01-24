---
title: Hive自动化建库建表
date: 2020-09-12
description: 
tags: [Hive]
category: 数据仓库
author: 惊羽
cover: /images/bot2.jpg
---
### 前言说明

项目数仓数据源太多，于是自己写了一个工具类，读取数据源的元数据信息，自动建库建表

以 MySQL 为例，代码如下。

### HiveUtil

```java
object HiveUtil {
  def main(args: Array[String]): Unit = {
    createHiveTable()
  }

  def createHiveTable() = {
    //连接MySQL，读取MySQL表名有哪些字段，字段类型，字段的注释
    val table_arr = Array(
      "area",
      "claim_info",
      "dd_table",
      "mort_10_13",
      "policy_acuary",
      "policy_benefit",
      "policy_client",
      "policy_surrender",
      "pre_add_exp_ratio",
      "prem_cv_real",
      "prem_std_real")

    val conn = DriverManager.getConnection("jdbc:mysql://node3:3306/insurance", "root", "123456")
    val ps: PreparedStatement = conn.prepareStatement(
      s"""
         |SELECT
         |       COLUMN_NAME,
         |       COLUMN_TYPE,
         |       COLUMN_COMMENT
         |FROM information_schema.COLUMNS
         |WHERE upper(TABLE_NAME)  = upper(?)
         |  and upper(TABLE_SCHEMA)=upper(?)
         |order by ORDINAL_POSITION
         |""".stripMargin)
    var rs: ResultSet = null
    for (tablename <- table_arr) {
      ps.setString(1,tablename)
      ps.setString(2,"insurance")
      rs = ps.executeQuery()
      var str =
        s"""
           |drop table if exists ${tablename};
           |create table if not exists ${tablename} (\n""".stripMargin
      while (rs.next()) {
        val column_name: String = rs.getString(1)
        val column_type: String = rs.getString(2)
        val column_comment: String = rs.getString(3)
        var temp_type = column_type
        if (temp_type.contains("int")) {
          //30000->int(5)->smallint
          //300000000->int(5-16)->int
          //3000000000000000000->int(16-32)->bigint
          val int: Int = "int(11)".split("\\(|\\)")(1).toInt
          if (int > 0 && int <= 5) {
            temp_type = "smallint"
          } else if (int > 5 && int <= 16) {
            temp_type = "int"
          } else {
            temp_type = "bigint"
          }
        }
        if(temp_type.contains("varchar") || temp_type.contains("text")){
          temp_type="string"
        }
        //println(column_name,column_type,column_comment)
        str += s"""${column_name}   ${temp_type}  comment '${column_comment}',\n"""
      }
      str = str.stripSuffix(",\n")
      str += ") comment '' \n row format delimited fields terminated by '\\t' ; \n"
      println(str)
    }

    rs.close()
    ps.close()
    conn.close()
    //解析上面的元数据，拼接成hive版的ddl语句
  }

}
```