---
title: Vol.20 企业生产环境当中 spark 任务提交的几种方式
date: 2023-04-22
description: 
tags: [周更挑战, Spark]
category: Spark
author: 惊羽
cover: https://s2.loli.net/2023/02/12/JhsFBVYuNkorAix.png
---
### spark 任务提交 4 种方式

spark 任务提交的方式通常有 4 种：spark-shell、spark-sql 、Thriftserver 服务、spark-submit。

#### spark-shell

spark-shell 是 Spark 自带的交互式 Shell 程序，方便用户进行交互式编程，用户可以在该命令行下用 Scala 编写 spark 程序。只能 client 模式跟 standalone 模式启动，通常是以测试为主,所以一般直接以 ./spark-shell 启动，进入本地模式测试。

#### spark-sql

跟 spark-shell 类似，同样在 spark 自带的一个 CLI，用于执行 spark sql 命令，通常也是用于测试。

#### Spark sql 服务 Thriftserver

Spark ThriftServer 是一个 JDBC 接口，用户可以通过 JDBC 连接 ThriftServer 来访问 Spark SQL 的数据。连接后可以直接通过编写SQL语句访问Spark SQL的数据，通常用于即席查询。ThriftServer 是在 Driver 的形式运行在集群的。因此它能使用的集群资源就和单个 Application 直接挂钩。如果 spark 集群没开启动态资源，那么Spark Thriftserver 能得到的资源就始终都是固定的，这时候设置太大也不好，设置太小也不好。即使开启了动态资源，一般集群都会设置 maxExecutor，这时还是无法很好的利用集群的所有资源。

#### spark-submit 

park-submit 用于提交一个spark任务，这个脚本 可以设置 spark 类路径（classpath）和应用程序依赖包，并且可以设置不同的 spark 所支持的集群管理和部署模式。 相对于s park-shell 来讲它不具有REPL(交互式的编程环境)的，在运行前需要指定应用的启动类，jar 包路径,参数等内容。spark-submit 通常用于生产环境，用于日常调度任务执行。

### 企业生产环境通常的管理方式

从上面几种执行方式我们就可以得知，企业生产当中最常用提交方式就是 spark_submit ，测试通常会使用 Thriftserver 服务 通过 beeline 客户端交互查询。生产当中为了方便管理，通常会进行封装，简化任务提交流程。

#### 封装 spark-submit 

spark-submit 提交支持提交 jar 或者 Python 文件，在企业生产当中可以统一封装好执行参数到调度系统，在调度执行文件的时候调用公共文件跟参数，通过自定义传入 jar 包、sql 文件、Python 文件的路径实现任务提交。

#### 封装 livy 统一通过 JDBC 执行

Livy 是一个提交 Spark 任务的 REST 服务，可以通过多种途径向 Livy 提交作业，比如我们常用的是 beeline 提交 sql 任务，还有其他的比如网络接口提交；任务提交到 Livy 后，Livy 向 Yarn 集群提交任务，Livy client 生成 Spark Context，拉起 Driver。Livy 可以同时管理多个 Spark Context，支持 batch 和 interactive 两种提交模式，功能基本类似 HiveServer。

企业生产封装抽象 beeline 执行入口，在 shell 脚本当中自定义参数跟 SQL ,调度系统直接执行 sh 脚本就能实现任务提交。这种方式最为常见自由度也最大，缺点就是 livy 本身存在一定缺陷，比如缺乏高可用服务、负载均衡服务等，需要进行二次开发。

### 参考资料

[Spark之Spark任务的提交方式](https://blog.csdn.net/weixin_45666566/article/details/112724328)

[一文带你弄懂Livy——基于Apache Spark的REST服务](https://www.jianshu.com/p/f5b12275d0e8)

[OPPO 大数据离线计算平台架构演进](https://xie.infoq.cn/article/4a46d20e21fe2abb5275ad903)
