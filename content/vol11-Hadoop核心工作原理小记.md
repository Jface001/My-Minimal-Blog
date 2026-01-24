---
title: Vol.11 Hadoop核心工作原理小记
date: 2023-02-19
description: 
tags: [周更挑战, Hadoop]
category: 数据仓库
author: 惊羽
cover: /images/203903550_M26ChZ8XJWpxbNv.png
---
![](/images/203903550_M26ChZ8XJWpxbNv.png)记录一下曾经学习 Hadoop 的笔记，温故知新，现在 Hadoop 已经到 3.x 版本，但是很多机制跟原理还是一致的。

### HDFS分布式文件系统

#### 设计目标

1、硬件故障是常态

2、HDFS上的应用与一般的应用不同，它们主要是以流式读取数据,更注重数据访问的高吞吐量

3、典型的HDFS文件大小是GB到TB的级别

4、大部分HDFS应用对文件要求的是write-one-read-many访问模型,一次写入,多次读取

5、移动计算的代价比之移动数据的代价低

6、在异构的硬件和软件平台上的可移植性

#### 应用场景

存储非常大的文件: 适合于存储大文件,需要 高吞吐量，对延时没有要求

一次写入、多次读取.一旦将存储进去后 不需要对数据进行修改, 后期只是查询场景

#### 三大机制和负载均衡

##### 副本机制

数据块的备份数,默认是3.

当某个数据块的个数不够3的时候,namenode会自动新增该数据块的备份, 当超过3块的时候,会自动删除多余的备份.

当不够3,又不能新增的时候,就会强制进入安全模式,只能读,不能写.

##### 心跳机制

datanode要定时(3秒)给namenode发送心跳包

- 主要目的

告诉namenode我还活着,如果没有定时发送,namenode就会认为我进入假死状态, 超过10分钟间隔就认为datanode宕机了

datanode定时(6个小时)向 namenode发送自己的块信息(元数据)

namenode的元数据是存储在内存中的,当集群启动的时候,datanode需要重新向namenode发送字节的快信息

##### 机架感知

将第一个副本放置在某一个机架上, 剩下两个副本放到另一个机架的不同服务器上

在存储一个文件的某一个副本的时候, 根据机架感知原理以及网络拓扑关系(寻最近机架),

##### 负载均衡

namenode要保证各个datanode的数据块的个数和整体利用率保持一致

#### NameNode

##### 基本原理

1.namenode保存的所有的元数据信息, 都是存储在内存中.

2.整个HDFS可存储的文件数受限于NameNode的内存大小

注意: 实际环境中, namenode需要选择一台性能较高的服务器来当做namenode

3.namenode, 在保存元数据的时候, 会先将元数据保存到磁盘上, 然后在内存中也保存一份.用于保存元数据的磁盘文件, 主要有二个: fsImage文件 和 edis文件

fsImage文件, 是namenode元数据的镜像文件: 保存一份较为完整的元数据信息

edits文件: 是namenode在运行过程中, 会将元数据更新, 新增 操作全部写入到edits文件中

注意:在达到一定阈值后, snn 会进行对 edits文件和fsImage文件进行合并操作, 以保证在namenode edits文件不至于过大.

4.namenode不真实负责数据的读写操作, 但是需要经过namenode的询问之后 才可以读取datanode数据

##### 作用

1. NameNode是HDFS的核心。
2. NameNode也称为Master。
3. NameNode仅存储HDFS的元数据：文件系统中所有文件的目录树，并跟踪整个集群中的文件。
4. NameNode不存储实际数据或数据集。数据本身实际存储在DataNodes中。
5. NameNode知道HDFS中任何给定文件的块列表及其位置。使用此信息NameNode知道如何从块中构建文件。
6. NameNode并不持久化存储每个文件中各个块所在的DataNode的位置信息，这些信息会在系统启动时从数据节点重建。
7. NameNode对于HDFS至关重要，当NameNode关闭时，HDFS / Hadoop集群无法访问。
8. NameNode是Hadoop集群中的单点故障。(3.0版本之后可以解决)
9. NameNode所在机器通常会配置有大量内存（RAM）

#### DataNode

1.datanode以数据块(block)来存储文件

2.datanode和namenode保持心跳的机制: 默认每隔3秒, 进行一次心跳, 如果10分钟内, 没有心跳, 认为, 宕机了

3.datanode每隔6个小时, 会向namenode报告一次完整的块信息

4.在真实集群中, 宕掉某一台datanode, 并不会整个集群的可用性, 因为namenode会自动的容错, 在其他的节点上构建缺失的block块

5.如果block块份数少于2分,又无法创建新的block快,HDFS会进入安全模式,只能读,不能写.

#### SecondaryNode

##### 主要功能

将edits文件和fsimage文件进行合并操作, 形成一个新的fsimage文件

##### 注意点

SNN所在的服务器的内存的容量 >= NN 内存容量

SNN服务器一般和NN服务器部署在不同的中服务器中, 以保证在紧急情况下可以进行元数据的恢复工作

##### 执行流程

1) SNN在时刻监控的NN中edits的文件, 当这个文件达到一定的阈值(时间/大小)后,SNN会通知namenode, 进行关闭当前Edits文件,然后滚动一个新的Edits文件
2) SNN 会基于http请求, 从NN中将edits文件和fsimage文件拷贝到自己的SNN的服务器磁盘上
3) SNN 将 edits文件和 fsimage文件统一加载内存中, 进行合并操作, 形成一个完整的fsimage文件
4) 将这个合并后的fsimage文件发送给NN, 替换掉原有Fsimage文件即可

#### HDFS读取数据流程

1.向namenode发送请求, 连接namenode, 请求读取数据操作

2.namenode接收到请求后,     首先要判断客户端用户是否具有读取权限, 如果没有, 直接报错, 如果有权限接下来要判断在要写入的路径下是否有这个文件, 如果没有, 直接报错, 如果有, 根据机架感知原理以及网络拓扑关系 和 副本机制,返回给客户端部分或者全部的block对应的datanode的地址信息列表

3.客户端接收到地址列表后, 开始并行方式连接多个datanode的地址, 进行读取数据

4.如果上一次返回的部分的block列表, 当读取完成后, 再次请求namenode, 获取剩余的部分或者全部的block对应的datanode信息在接着执行第三步, 进行读取数据操作, 直到将所有的block全部读取完成

5.在client客户端, 进行对block排序, 然后将每个block拼接在一起, 形成了最终的文件

#### HDFS写入数据流程

1.客户端发送请求, 连接namenode, 请求写入数据操作

2.namenode接收到请求后, 首先要判断客户端用户是否具有写入权限, 如果没有, 直接报错, 如果有权限接下来要判断在要写入的路径下是否有这个文件, 如果有, 直接报错, 如果没有, 通知客户端可以写入

3.客户端接收到可以写入的信息后, 开始对文件进行切分, 形成多个block块

4.客户端请求namenode, 询问第一个block应该存储在那些datanode中

5.namenode 根据机架感知原理以及网络拓扑关系 和 副本机制, 来寻找到对应的datanode的地址列表, 然后将这些datanode的地址列表返回客户端

6.客户端从接收地址列表中, 拿出第一个地址与之连接, 形成一个pipeline的管道

7.当第一个连接成功后, 让第一个连接第二个地址, 然后第二个在连接第三个地址, 形成一个pipeline的管道

8.客户端开始进行写入数据: 数据以 package 数据包(64kb)的形式来发送数据, 当第一台接收数据后, 然后将请求发送给第二个datanode, 然后第二个接收到以后,然后在发送给第三个datanode

9.当第一个接收到数据后, 建立好一个应答响应队列, 当每个节点接收数据后, 都向应答队列反向报告, 最终所有都报告完成后, 将应答队列返回客户端

10.不断的进行发送, 不断的进行应答响应, 即可完成数据的发送, 当第一个block发送完成后, 重新请求namenode第二个block应该存储在那些datanode中, 此时在从流程第5步, 往下走即可 ... 循环让所有的block写入成功即可

#### HDFS读取数据流程(记忆版)

1.发送请求

2.判断权限并返回地址

3.并行读取数据

4.再次请求,直至所有block完成

5.排序拼接

#### HDFS写入数据流程(记忆版)

1.发送请求

2.判断权限

3.切块

4.询问地址

5返回地址

6.建立管道

7.建立完整管道

8.开始传输数据

9.建立应答机制

10.完成一个block,重新开始请求地址,直至写入完成

#### HDFS的shell命令

```bash
lsr 递归查看目录结构
mkdir
put 上传文件操作
get 下载数据
getmerge 合并下载操作
mv
rm -r
cp
cat
du 统计目录下个文件大小
chmod 修改权限
appendToFile 追加数据操作
copyFromLocal
moveFromLocal
copyToLocal
moveToLocal 未实现
```

#### API操作

操作思路

1. 创建客户端对象
2. 执行具体操作
3. 释放资源

```bash
1.获取FileSystem方式
方式1:默认文件系统
Configuration conf = new Configuration()
方式2:指定文件系统,当前Windows用户
conf2.set("fs.defaultFS","hdfs://node1:8020")
方式3:指定文件系统.指定用户
FileSystem filesystem03 = FileSystem.*get*(uri, conf3, "root");

2.遍历HDFS中所有文件 
filesystem.listFiles()

3.创建文件夹
fileSystem.mkdirs()

4.下载文件
copyToLocalFile()

5.上传文件
fileSystem.copyFromLocalFile()

6.小文件合并
filehdfs.create() 
filelocal.listFiles() 
filelocal.open() 
 IOUtils.*copy*(fis,fos) 
IOUtils.*closeQuietly*(fis)

7.删除文件
fileSystem.delete()

8.权限控制
修改vim hdfs-site.xml中的<name>dfs.permissions.enabled</name> <value>true</value>
```

#### 其它操作

##### HDFS安全模式

- 概念

集群启动时,副本少于2又不能创建新的block快时

在安全模式状态下，文件系统只接受读数据请求，而不接受删除、修改等变更请求

- 命令

查看安全模式:hdfs  dfsadmin safemode get

进入安全模式:hdfs  dfsadmin safemode  enter

离开安全模式 hdfs  dfsadmin safemode  leave

##### HDFS基准测试

测试写入速度

测试读取速度

##### 集群内数据复制 scp

##### 跨集群文件拷贝distscp

##### Archive档案

对小文件进行合并为大文件的操作, 减少hdfs中小文件的数量

##### Snapshot快照：差异化快照

##### Trash回收站

类似Windows的回收站

##### 联邦机制

对datanode 实施 命名空间操作. 将datanode划分成多个命名空间(数据库), 然后每个命名空间交给一个namenode来管理

多个namenode, 共享整个datanode

### MapReduce分布式计算系统

#### 模型介绍

1. MapReduce思想:分而治之,Map负责分,Reduce负责合
2. MapReduce就是一个分布式计算的框架
3. 我们只需要关心, 需要计算什么内容, 如何计算, 逻辑是什么, 至于最终如何运行, 如何拆解多个map和多个reduce,如何申请资源等等事情, 都与我们无关.
4. 核心功能是将用户编写的业务逻辑代码和自带默认组件整合成一个完整的分布式运算程序
5. MapReduce处理的数据类型是<key,value>键值对

#### 编程规范-核心八步

##### map阶段

1.读取数据, 将数据转换为 k1 和 v1
2.自定义map逻辑, 将k1 和 v1  转换为 k2 和 v2

##### shuffle阶段:  k2 和 v2 转换成 新 k2 和 v2

3.分区: 将相同的k2的数据发送给同一个reduce程序
4.排序: 根据k2的数据 进行排序操作 (默认按照字典的升序来排列)
5.规约: 是MapReduce的优化步骤, 可以省略
6.分组: 将相同的k2的value的数据进行合并为一个集合操作

##### reduce阶段

7.自定义 reduce的逻辑, 将经过shuffle 的k2 和 v2 进行转换为 k3 和 v3
8.输出操作: 将k3 和 v3 输出目的地即可

##### 结论

如果要想实现一个非常简单的MapReduce程序, 只需要编写其中  二步操作(第二步 和 第七步)

#### 编程步骤

用户编写的程序分成三个部分：Mapper，Reducer，Driver(提交运行mr程序的客户端)

##### Mapper

(1)  自定义类继承Mapper类
(2)  重写自定义类中的map方法，在该方法中将K1和V1转为K2和V2
(3)  将生成的K2和V2写入上下文中

##### Reducer

(1)  自定义类继承Reducer类
(2)  重写Reducer中的reduce方法，在该方法中将K2和[V2]转为K3和V3
(3)  将K3和V3写入上下文中

##### Driver

整个程序需要一个Drvier来进行提交，提交的是一个描述了各种必要信息的job对象
（1）定义类，编写main方法
（2）在main方法中指定以下内容:
1、创建建一个job任务对象
2、指定job所在的jar包
3、指定源文件的读取方式类和源文件的读取路径
4、指定自定义的Mapper类和K2、V2类型
5、指定自定义分区类（如果有的话）
6、指定自定义分组类（如果有的话）
7、指定自定义的Reducer类和K3、V3的数据类型
8、指定输出方式类和结果输出路径
9、将job提交到yarn集群



#### wordcount案例

新建Maven工程,配置pom.xml
编写Map任务,继承Mapper类
shuffle阶段,用默认的
编写Reduce任务,继承Reducer类
编写Driver类,封装核心8步
本地运行和集群运行

##### 本地运行:直接运行即可

##### 集群运行

1.配置pom.xml,打成胖jar上传HDFS
2.修改输入和输出路径为args[0] & args[1]
3.设置jar的启动类 job.setJarByClass(WorkCountMain3.class)
4.启动命令格式 yarn  jar  jar包的路径  jar包的主入口类的全类名  [args ...]

#### Mapper任务流程详解

特点: Hadoop是一个IO密集型框架, 里边有大量的IO的读写操作

##### Map阶段总体流程:

内存(环形缓冲区) --> 磁盘(临时小文件) --> 磁盘(合并后的最终MapTask结果文件)

##### 详细流程

1) 假设HDFS系统中的某一个文件, 被切分成了 3个block块, 分别为: block-0, block-1, block-2.
2) 此时就会有三个MapTask任务, 分别去读取这 3个block块 中的数据.

即: TextInputFormat一行一行读取数据, 获取k1(LongWritable行偏移量) 和 v1(Text, 整行数据)

3) 三个MapTask任务要做的事儿都是一致的, 都是要把k1,v1 转成 k2, v2.

在读取数据过程中, 读取一行就会调用一次 MapTask中map方法,
在map方法中, 是将接收到k1 和 v1 转换为 k2 和 v2 过程

4) 当map处理一条数据后, 就会往出写数据, 只要数据一写出去, 就会执行分区(partition)操作,分区操作的核心, 是对 这条数据进行 打分区标记 的过程

分区可以保证: 相同key , 打上分区的编号必然是一样的
默认分区方案: hash 取模计算法 % numReduceTask

5) 当分好区以后, 数据就会被写入到 环形缓冲区中, 环形缓冲区本质上就是一个内存空间(数组), 大小为100M.

MapTask一条一条的输出, 分区一条一条处理, 一条条的数据写入到环形缓冲区, 当这个环形缓冲区容量达到0.8系数,就会启动一个溢写的线程, 用来将80%的数据溢写到磁盘上, 在溢写过程中就会执行排序的工作
如果此时有规约, 此时就是执行规约的时候了.

6) 当MapTask执行完成后, 如果 环形缓冲区 依然还有一些剩余数据, 则一次性全部溢写到磁盘上, 此时在磁盘上就会有多个溢写出来的临时文件, 然后对这些临时文件进行 merge合并 操作, 形成一个最终的: 排好序, 分好区 规约好 的大文件.最终合并成一个大文件的时候, 依然会进行排序和规约操作.

##### 问题: 为什么环形缓冲区写到80%, 就要进行溢写呢, 而不是写满在溢写?

假设写到100%, 这个时候再溢写, MapTask无法再写入数据了, 需要等待溢写完成
如果写到80%, 额外开启一个溢写线程, 负责将80%数据写出到磁盘, 主线程依然可以往内存中写入数据

#### Reducer任务流程详解

##### Reduce阶段总体流程:

磁盘 --> 内存(copy线程) --> 磁盘(临时小文件) --> 磁盘(合并后的最终ReduceTask结果文件)

##### 详细流程

1) 当reduceTask检测到mapTask全部都执行完成了, 开启copy(线程)的机制, 从多个mapTask中拷贝属于自己的分区的数据.

每个ReduceTask都会创建Copy线程, 只拷贝属于自己的分区的数据.

2) 在copy过程中, 会先将数据写入到内存中, 当内存存储不下的时候, 在溢写到磁盘上, 形成临时文件
3) 当copy结束后, 会将所有溢写出来的临时文件全部合并(merge)为一个大文件, 此时在合并的过程中,会对数据进行重新的排序工作, 如果reduce只有一个, 此时排序就是全局排序, 如果是多个, 依然是局部排序操作.
4) 对排序好数据, 执行分组操作, 将相同key的value数据合并为一个集合,每分好一组, 调用一次reduceTask中reduce方法.
5) reduce方法执行完成后, 将结果数据直接输出即可.
6) 输出组件就会将reduce的输出内容, 输出到目的地址上

#### 分区

- 概念

相同类型的数据, 有共性的数据, 送到一起去处理

- 作用

指定分区, 会将同一个分区的数据发送到同一个Reduce当中进行处理。

- 大白话理解

分区就是map阶段中, 对map的数据进行打标记的过程
有几个分区,就有几个Reduce,结果就有几个文件,一般结合job.ReduceTasks()配合使用
彩票案例:自定义分区组件,继承Partitioner类,重写getPartition方法

#### 排序和序列化

- 序列化概念

序列化（Serialization）是指把结构化对象转化为字节流。
反序列化（Deserialization）是序列化的逆过程。把字节流转为结构化对象。

- Writable接口:序列化和反序列化
- 子接口WritableComparable:序列化和排序

重写compareTo方法
前减后升序, 后减前降序

- 子类WritableComparator: 序列化和分组

#### 规约

- 概念

每一个 map 都可能会产生大量的本地输出，Combiner 的作用就是对 map 端的输出先做一次合并，以减少在 map 和 reduce 节点之间的数据传输量，以提高网络IO 性能，是 MapReduce 的一种优化手段之一
combiner 是 MR 程序中 Mapper 和 Reducer 之外的一种组件
combiner 组件的父类就是 Reducer

- combiner 和 reducer 的区别:运行的位置不同

combiner 是在每一个 maptask 所在的节点运行
Reducer 是接收全局所有 Mapper 的输出结果

- 作用

combiner 的意义就是对每一个 maptask 的输出进行局部汇总，以减小网络传输量

- 如何实现自定义规约

1.创建一个类, 继承Reudcer
2.重写reducer提供的reduce的方法. 在reduce的方法中, 实现局部聚合逻辑

3. 在MR的驱动类中, 将combinner的类添加到驱动类中job.setConbinnerClass()

#### 分组

- 概念

将相同的k2的value数据进行合并形成一个集合操作 , 在reduce中对同一个分区下的数据, 进行分组操作
在一个分区下, 可以有多个不同的key, 但同一个key只能在一个分区下

- 分区和分组的区别

分组: 将相同的k2的value数据进行合并形成一个集合操作 , 在reduce中对同一个分区下的数据, 进行分组操作
分区: 将相同的k2的数据, 发往同一个reduce中 , 在map端执行

- 如何实现自定义分区

1.创建一个类, 继承一个  WritableComparator
2.重写空参构造 在空参构造中指定, 当前k2的类型什么, 以及是否需要创建k2对象
public MyGroup()  { // 告知 分组组件, k2 是一个什么类型的, 已经需要将其k2对象创建出来
super(OrderBean.class,true);  }
3.重写其  compare方法: 方法中有两个 writableComparable 对象,本质上其实是两个k2的值
3.1: 强转为 k2的类型
3.2: 根据需求, 告知 MR比较k2什么字段

#### 并行机制

##### MapTask

- 概念

MapTask的并行度指的是map阶段有多少个并行的task共同处理任务

- 并行度

一个MapReducejob的map阶段并行度由客户端在提交job时决定，客户端提交job之前会对待处理数据进行逻辑切片。

逻辑切片机制由FileInputFormat实现类的getSplits()方法完成。

##### FileInputFormat切片机制 (默认)

1) 切片大小，默认等于block大小，即128M
2) block是HDFS上物理上存储的存储的数据，切片是对数据逻辑上的划分
3) 在FileInputFormat中，计算切片大小的逻辑：Math.max(minSize, Math.min(maxSize, blockSize))

注意事项:逻辑切片

##### ReduceTask

1) reducetask并行度同样影响整个job的执行并发度和执行效率,Reducetask数量的决定是可以直接手动设置的, 即:   job.setNumReduceTasks(4)
2) 如果数据分布不均匀，就有可能在reduce阶段产生数据倾斜。

- 并行度

reducetask数量并不是任意设置，还要考虑业务逻辑需求，有些情况下，需要计算全局汇总结果，就只能有1个reducetask

#### 性能优化

##### 数据输入

合并小文件采用CombineTextInputFormat来作为输入

##### Map阶段

A. 减少溢写（spill）次数
B. 减少合并（merge）次数
C. 在map之后，不影响业务逻辑前提下，先进行combine处理，减少 I/O。

##### Reduce阶段

A. 合理设置map和reduce数
B. 设置map、reduce共存
C. 规避使用reduce,通过将MapReduce参数setNumReduceTasks设置为0来创建一个只有map的作业。
D. 合理设置reduce端的buffer.

##### Shuffle阶段

Shuffle阶段的调优就是给Shuffle过程尽量多地提供内存空间，以防止出现内存溢出现象
可以由参数mapred.child.java.opts来设置，任务节点上的内存大小应尽量大。

##### 其它属性调优

MapReduce还有一些基本的资源属性的配置，这些配置的相关参数都位mapred-default.xml

### YARN资源调度器

#### 概念

统一的资源管理调度平台

服务器的资源: CPU  内存 磁盘

#### 基本架构

**ResourceManager: yarn集群中主节点, 可以部署多个, 一般部署为2个**

1) 接收客户端提交的任务请求
2) 在nodemanger上为每一个任务启动 applicationMaster程序
3) 负责资源的调度工作
4) 负责整个集群管理

**NodeManager: yarn集群中从节点, 可以部署多个, 一般部署的数量和datanode节点数相同**

负责执行的任务,基于容器(Container)的资源

**ApplicationMaster: 每一个任务都会有一个app Master ,负责任务分配**

1) 计算当前这个任务, 需要启动多少个map 和 多少个reduce
2) 负责向resourceManager申请资源
3) 通知给各个nodemanager启动运行程序, 并且持续的监控这个程序的运行的状态

#### Yarn运行流程

1) client向RM提交应用程序，其中包括启动该应用的ApplicationMaster的必须信息，例如ApplicationMaster程序、启动ApplicationMaster的命令、用户程序等。
2) ResourceManager启动一个container用于运行ApplicationMaster。
3) 启动中的ApplicationMaster向ResourceManager注册自己，启动成功后与RM保持心跳。
4) ApplicationMaster向ResourceManager发送请求，申请相应数目的container。
5) ResourceManager返回ApplicationMaster的申请的containers信息。申请成功的container，由ApplicationMaster进行初始化。container的启动信息初始化后，AM与对应的NodeManager通信，要求NM启动container。AM与NM保持心跳，从而对NM上运行的任务进行监控和管理。
6) container运行期间，ApplicationMaster对container进行监控。container通过RPC协议向对应的AM汇报自己的进度和状态等信息。
7) 应用运行期间，client直接与AM通信获取应用的状态、进度更新等信息。
8) 应用运行结束后，ApplicationMaster向ResourceManager注销自己，并允许属于它的container被收回。

#### Yarn 调度器 Scheduler

FIFO Scheduler : 先进先出的调度器(很少使用)

capacity scheduler : 容量调度器(Apache Hadoop默认)

Fair Scheduler : 公平调度器(CDH默认)

#### Yarn常用参数

设置container分配最小内存

设置container分配最大内存

设置每个container的最小虚拟内核个数

设置每个container的最大虚拟内核个数

设置NodeManager可以分配的内存大小

定义每台机器的内存使用大小

定义交换区空间可以使用的大小
