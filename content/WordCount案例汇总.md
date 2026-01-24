---
title: WordCount案例汇总
date: 2020-11-06
description: 
tags: [Hadoop, Scala, Spark, Flink]
category: 日常工作
author: 惊羽
cover: /images/wordcount.jpg
---
## 前言说明

整理一下曾经学习技术栈练习过的 WordCount 案例，总之很多计算引擎的样例都是 WordCount

经典永不过时，使用的很多函数和方法也是常用的。

## MapReduce

### MapTask

```java
package com.test;

import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.LongWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Mapper;

import java.io.IOException;

/**
 * @Desc: 自定义的Map规则, 用来实现把: k1, v1 -> k2, v2, 需要 继承Mapper类, 重写map方法.
 * 各个数据解释:
 * k1: 行偏移量, 即:从哪里开始读取数据,默认从0开始.
 * v1: 整行数据, 这里是: "hello hello", "world world", "hadoop hadoop"....
 * k2: 单个的单词, 例如: "hello", "world", "hadoop"
 * v2: 每个单词的次数, 例如: 1, 1, 1, 1, 1....
 */
public class WordCountMapTask extends Mapper<LongWritable, Text, Text, IntWritable> {

    /**
     * 重写map方法,用来将K1 V2 转换成 K2 V2
     *
     * @param key     k1
     * @param value   v1
     * @param context 内容对象,用来写出K2,V2
     * @throws IOException
     * @throws InterruptedException
     */
    @Override
    protected void map(LongWritable key, Text value, Context context) throws IOException, InterruptedException {
        //1.获取行偏移量,没有什么用处,我们用于测试看看的
        long index = key.get();
        System.out.println("行偏移量是: " + index);
        //2.获取整行数据
        String line = value.toString();
        //3.读取并做非空校验,判断值是否相等,也判断地址值是否相等
        if (line != null && !"".equals(line)) {
            //4.切割获取K2,V2
            String[] str = line.split(" ");
            for (int i = 0; i < str.length; i++) {
                String s = str[i];
                context.write(new Text(s), new IntWritable(1));
            }
        }
    }
}
```

### ReduceTask

```java
package com.test;

import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Reducer;

import java.io.IOException;

/**
 * @Desc: 自定义的Reduce规则, 用来实现把: k2, v2的集合 -> k3, v3, 需要 继承Reducer类, 重写reduce方法.
 * 各个数据解释:
 * k1: 行偏移量, 即:从哪里开始读取数据,默认从0开始.
 * v1: 整行数据, 这里是: "hello hello", "world world", "hadoop hadoop"....
 * k2: 单个的单词, 例如: "hello", "world", "hadoop"
 * v2: 每个单词的次数, 例如: 1, 1, 1, 1, 1....
 * <p>
 * shuffle阶段: 分区, 排序, 规约, 分组之后, 数据如下:
 * <p>
 * k2: 单个的单词, 例如: "hello", "world", "hadoop"
 * v2(的集合): 每个单词的所有次数的集合, 例如: {1, 1},  {1, 1, 1}, {1, 1}
 * <p>
 * k3: 单个的单词, 例如: "hello", "world", "hadoop"
 * v3: 每个单词的总次数, 例如: 2, 3, 2
 */
public class WorkCountReduceTask extends Reducer<Text, IntWritable, Text, IntWritable> {

    //重写reduce方法

    /**
     * 重写reduce方法,用于把k2,v2 转换成k3,v3
     *
     * @param key     k2
     * @param values  v2的集合(已经经过了分组)
     * @param context 内容对象,用来写k3,v3
     * @throws IOException
     * @throws InterruptedException
     */
    @Override
    protected void reduce(Text key, Iterable<IntWritable> values, Context context) throws IOException, InterruptedException {
        //1.获取k3,就是每个单词
        String word = key.toString();
        //2.获取v3,就是单词出现的次数
        //2.1先对v2集合求和
        int count = 0;
        for (IntWritable value : values) {
            count += value.get();
        }
        //2.2写出v3
        //context.write(new Text(word),new IntWritable(count));
        //因为v2和v3是一样的,我们可以优化一下
        context.write(key, new IntWritable(count));
    }
}
```

### WordCountMain简写版

```java
package com.test;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.TextInputFormat;
import org.apache.hadoop.mapreduce.lib.output.TextOutputFormat;

import java.io.IOException;

/**
 * 这里写的是驱动类, 即: 封装MR程序的核心8步的. 它有两种写法:
 * 1. 官方示例版, 即: 完整版.   理解即可, 因为稍显复杂, 用的人较少.
 * 2. 简化版.  推荐掌握.
 * 这里是简化版写法
 */
public class WorkCountMain {
    public static void main(String[] args) throws Exception {
        //1.创建Job任务,指定任务名 一个Job任务 = 一个MR程序
        Job job = Job.getInstance(new Configuration(), "wordcountMR");
        //2.封装MR程序核心8步
        //2.1 封装输入组件,读取(数据源)中的数据,获取k1,v1
        job.setInputFormatClass(TextInputFormat.class);
        TextInputFormat.addInputPath(job, new Path("file:///d:/test/wordcount/input/wordcount.txt"));
        //2.2 封装自定义的Maptask任务,把k1,v1 --> k2,v2
        job.setMapperClass(WordCountMapTask.class);
        job.setMapOutputKeyClass(Text.class);
        job.setMapOutputValueClass(IntWritable.class);
        //2.3 分区,用默认的
        //2.4 排序,用默认的
        //2.5 规约,用默认的
        //2.6 分组,用默认的
        //2.7 封装自定义的Reducetask任务,把k2,v2 --> k3,v3
        job.setReducerClass(WorkCountReduceTask.class);
        job.setOutputValueClass(Text.class);
        job.setOutputValueClass(IntWritable.class);
        //2.8 封装输出组件,关联目的地文件,写入获取的k3,v3. 牢记必须有父目录,不能有子目录.
        job.setOutputFormatClass(TextOutputFormat.class);
        TextOutputFormat.setOutputPath(job, new Path("file:///d:/test/wordcount/output"));
        //3.提交Job任务,等待任务执行完成反馈的状态, true等待结果  false只提交,不等待接收结果
        boolean flag = job.waitForCompletion(true);
        //4.退出当前进行的JVM程序 0正常退出, 非0异常退出
        System.exit(flag ? 0 : 1);
    }
}
```

### WordCountMain jar包版

```java
package com.test;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.TextInputFormat;
import org.apache.hadoop.mapreduce.lib.output.TextOutputFormat;

/**
 * 这个代码一会儿是要打包成jar包, 然后放到Yarn集群中运行的, 需要做如下的几件事儿:
 * 1. 在驱动类中设置 jar包的启动类.
 * job.setJarByClass(WordCountMain3.class);
 * 2. 修改数据源文件 和 目的地文件的路径, 改为: 外部传入.
 * TextInputFormat.addInputPath(job, new Path(args[0]));
 * TextOutputFormat.setOutputPath(job, new Path(args[1]));
 * 3. 对我们当前的工程进行打包动作, 打包成: 胖jar, 具体操作为: 取消pom.xml文件中最后一个插件的注释, 然后打包即可.
 * 细节: 修改jar包名字为: wordcount.jar, 方便我们操作.
 * <p>
 * 4. 在HDFS集群中创建:   /wordcount/input/ 目录
 * 5. 把wordcount.txt 上传到该目录下.
 * 6. 把之前打好的 jar包也上传到 Linux系统中.
 * 7. 运行该jar包即可, 记得: 传入 数据源文件路径, 目的地目录路径.
 * <p>
 * 名词解释:
 * 胖jar: 指的是一个jar包中还包含有其他的jar包, 这样的jar包就称之为: 胖jar.
 * <p>
 * 问题1: 为什么需要打包成 胖jar?
 * 答案:
 * 因为目前我们的工程需要依赖 Hadoop环境, 而我们已经在pom.xml文件中配置了,
 * 如果运行的环境中(例如: Linux系统等)没有hadoop环境, 并且我们打包时也没有把hadoop环境打包进去,
 * 将来运行jar包的时候就会出错.
 * <p>
 * 问题2: 当前工程一定要打包成 胖jar吗?
 * 答案: 不用, 因为我们的 jar包一会儿是放到 Yarn集群中运行的, 它已经自带Hadoop环境, 所以这里可以不打包 胖jar, 只打包我们自己的代码.
 */
public class WorkCountMain3 {
    public static void main(String[] args) throws Exception {
        //1.创建Job任务,指定任务名 一个Job任务 = 一个MR程序
        Job job = Job.getInstance(new Configuration(), "wordcountMR");
        //细节1: 在驱动类中设置 jar包的启动类.
        job.setJarByClass(WorkCountMain3.class);

        //2.封装MR程序核心8步
        //2.1 封装输入组件,读取(数据源)中的数据,获取k1,v1
        job.setInputFormatClass(TextInputFormat.class);
        TextInputFormat.addInputPath(job, new Path(args[0]));
        //2.2 封装自定义的Maptask任务,把k1,v1 --> k2,v2
        job.setMapperClass(WordCountMapTask.class);
        job.setMapOutputKeyClass(Text.class);
        job.setMapOutputValueClass(IntWritable.class);
        //2.3 分区,用默认的
        //2.4 排序,用默认的
        //2.5 规约,用默认的
        //2.6 分组,用默认的
        //2.7 封装自定义的Reducetask任务,把k2,v2 --> k3,v3
        job.setReducerClass(WorkCountReduceTask.class);
        job.setOutputValueClass(Text.class);
        job.setOutputValueClass(IntWritable.class);
        //2.8 封装输出组件,关联目的地文件,写入获取的k3,v3. 牢记必须有父目录,不能有子目录.
        job.setOutputFormatClass(TextOutputFormat.class);
        TextOutputFormat.setOutputPath(job, new Path(args[1]));
        //3.提交Job任务,等待任务执行完成反馈的状态, true等待结果  false只提交,不等待接收结果
        boolean flag = job.waitForCompletion(true);
        //4.退出当前进行的JVM程序 0正常退出, 非0异常退出
        System.exit(flag ? 0 : 1);
    }
}
```

## Scala

基本流程

```java
基本流程
1.传输文件路径到自定义的Actor类,并接收返回值,解析返回值得出统计结果
2.自定义Actor类, 接收文件路径并做解析统计单词再返回给发送者

需要分别定义3个类
Main入口
1.用于发送文件路径,封装在自定义的单例类里面
2.接收返回值,并做判断是否完成传输, 如果完成就开始解析
3.通过apply方法解析结果,合并结果得出最后结果

自定义的Actor类
1.接收文件路径信息,做分析统计
2.把结果封装在单例类中,返回给发送者

自定义的单例类
1.用于封装发送信息的单例类
2.用于返回统计的单例类

```

### MainActor

```java
`package com.test.day04.wordcount

import com.test.day04.wordcount.WordCountPackage.{WordCountResult, WordCountTask}

import java.io.File
import scala.actors.Future

/**
 * 1.发送文件名给WordCountActor
 * 2.接收WordCountActor返回结果并合并
 */
object MainActor {

  //发送文件名给WordCountActor
  def main(args: Array[String]): Unit = {
    //1.获取文件名
    val fileDir = new File("./data")
    val files: Array[File] = fileDir.listFiles()
    // 测试是成功获取文件名
    // files.foreach(println(_))

    //2.发送给wordcountactor
    val future_Array: Array[Future[Any]] = files.map(f = file => {
      val name = file.toString
      //每一个文件名新建对应的线程
      val actor = new WordCountActor
      //开启线程并发送给我认定任务
      actor.start()
      //发送的消息封装在这里面并获取结果
      val future: Future[Any] = actor !! WordCountTask(name)
      future
    })

    //接收WordCountActor返回结果并合并
    //先判断是否全部文件都处理完毕都有结果,是再处理
    while (!(future_Array.filter((x) => {
      !x.isSet
    })).isEmpty) {}
    //走到这里, 证明我们可以处理,使用apply获取数据
    //里面的键值对就是多个文件统计结果, 我们还需要合并去重
    val wordCount: Array[Map[String, Int]] = future_Array.map((x) => {
      val results: Any = x.apply()
      val result = results.asInstanceOf[WordCountResult]
      val map: Map[String, Int] = result.map
      map
    })
    //wordCount.foreach(println(_))
    //测试结果
    // Map(e -> 2, f -> 1, a -> 1, b -> 1, c -> 1)
    // Map(e -> 1, a -> 2, b -> 1, c -> 2, d -> 3)

    //合并结果, 先合并成一个Array
    val flatten: Array[(String, Int)] = wordCount.flatten
    //根据Map的key值分组
    val wordGroup: Map[String, Array[(String, Int)]] = flatten.groupBy((x) => {
      x._1
    })
    val finalResult: Map[String, Int] = wordGroup.map((x) => {
      val name = x._1
      val size = x._2.size
      name -> size
    })

    finalResult.foreach(println(_))

  }

}
```

### WordCountActor

```java
package com.test.day04.wordcount

import com.test.day04.wordcount.WordCountPackage.{WordCountResult, WordCountTask}

import scala.actors.Actor
import scala.io.Source

/**
 * 1.接收MainActor的文件名称并进行单词统计
 * 2.将单词统计结果返回给MainActor
 */
class WordCountActor extends Actor {
  override def act(): Unit = {
    //接收消息
    loop {
      react {
        case WordCountTask(filename) =>
          println("收到了文件名: " + filename)
          //解析消息, 通过Source解析消息, 定义文件来源再转化成列表
          //一个元素就是一个一行数据
          val words: List[String] = Source.fromFile(filename).getLines().toList
          //切割获取每一条数据并合并成一个list集合
          val word_List: List[String] = words.flatMap((x) => {
            x.split(" ")
          })
          //按照单词进行分组, 然后聚合统计
          val word_Tuples: List[(String, Int)] = word_List.map((x) => {
            (x, 1)
          })
          val word_Map: Map[String, List[(String, Int)]] = word_Tuples.groupBy((x) => {
            x._1
          })
          val wordCountMap: Map[String, Int] = word_Map.map((x) => {
            val name: String = x._1
            val size: Int = x._2.size
            name -> size
          })

          //把统计结果反馈给Mainactor,装进WordCount
          sender ! WordCountResult(wordCountMap)
      }

    }
  }

}
```

### WordCountPackage

```java
package com.test.day04.wordcount

/**
 * 1.定义一个样例类, 描述单词统计信息
 * 2.定义一个样例类封装单词统计结果
 */
object WordCountPackage {

  //1.定义一个样例类, 描述单词统计信息
  case class WordCountTask(filename: String)

  //2.定义一个样例类封装单词统计结果
  case class WordCountResult(map: Map[String, Int])

}
```

## Spark

### SparkCore

- 基本流程

```java
1.创建上下文对象
2.读取文件
3.flatMap获取到每个单词
4.map将RDD变成 key-value结构
5.reduceByKey 求和统计
6.打印输出
7.关闭上下文对象
```

- 本地版

```scala
package com.test.day01

import org.apache.spark.rdd.RDD
import org.apache.spark.{SparkConf, SparkContext}

object WordCount {
  def main(args: Array[String]): Unit = {
    //1.创建上下文对象
    val conf = new SparkConf().setAppName("WordCount").setMaster("local[*]")
    val sc: SparkContext = new SparkContext(conf)
    //2.加载文本文件words.txt,生成一个RDD
    val inputRDD: RDD[String] = sc.textFile("src/main/data/words.txt")
    //3.对RRD进行扁平化成单词
    val flatRDD = inputRDD.flatMap((x) => {
      x.split(" ")
    })
    //4.继续对每个单词标记为1
    val wordOneRDD = flatRDD.map((_, 1))
    //5继续reduceByKey进行分组统计
    val ouputRDD = wordOneRDD.reduceByKey(_ + _)
    //6.生成最后的RDD, 将结果打印到控制台
    ouputRDD.foreach(println(_))
    //7.关闭上下文
    sc.stop()

  }

}
```

- Linux版

```scala
package com.test.day01

import org.apache.spark.rdd.RDD
import org.apache.spark.{SparkConf, SparkContext}

object WordCount_Linux {
  def main(args: Array[String]): Unit = {
    //0.创建输入路径和输出路径
    val input_path = args(0)
    val output_path = args(1)
    //1.创建上下文对象
    val conf = new SparkConf().setAppName("WordCount")
    val sc: SparkContext = new SparkContext(conf)
    //2.加载文本文件words.txt,生成一个RDD
    val inputRDD: RDD[String] = sc.textFile(input_path)
    //3.对RRD进行扁平化成单词
    val flatRDD = inputRDD.flatMap((x) => {
      x.split(" ")
    })
    //4.继续对每个单词标记为1
    val wordOneRDD = flatRDD.map((_, 1))
    //5继续reduceByKey进行分组统计
    val ouputRDD = wordOneRDD.reduceByKey(_ + _)
    //6.生成最后的RDD, 将结果上传到HDFS
    ouputRDD.saveAsTextFile(output_path)
    //7.关闭上下文
    sc.stop()

  }

}
```

### SparkSQL

```scala
package com.test.sparksql

import org.apache.spark.sql.{DataFrame, Dataset, Row, SparkSession}


/**
 * @Author: Jface
 * @Date: 2021/9/9 23:34
 * @Desc: 使用 SparkSQL 读取文本文件做 Wordcount，分别使用 DSL 和 SQL 风格实现
 */
object Wordcount {
  def main(args: Array[String]): Unit = {
    //1.构建上下文对象，并导包
    val spark: SparkSession = SparkSession.builder()
      .appName(this.getClass.getSimpleName.stripSuffix("$"))
      .master("local[*]")
      .config("spark.sql.shuffle.partitions", 4)
      .getOrCreate()

    import spark.implicits._
    //2.读取文本文件，获取 DataSet
    val inputDataSet: Dataset[String] = spark.read.textFile("learnSpark/datas/wordcount.data")
    //测试看看
    //inputDataSet.printSchema()
    //inputDataSet.show()
    //3.使用 DSL风格实现，导包
    import org.apache.spark.sql.functions._
    //3.1 过滤脏数据
    val resultDataset01: Dataset[Row] = inputDataSet.where($"value".isNotNull && length(trim($"value")) > 0)
      //3.2 切割并把 value 行转成列
      .select(explode(split(trim($"value"), "\\s+")).as("word"))
      //3.3 分组并聚合
      .groupBy($"word")
      .agg(count($"word").as("total"))
      //3.4 倒序并只求前5条信息~
      .orderBy($"total".desc)
      .limit(5)

    //resultDataset01.printSchema()
    //resultDataset01.show(10, truncate = false)

    //4.使用 SQL 风格实现
    //4.1 注册临时视图
    //4.2 编写 SQL 并执行
    inputDataSet.createOrReplaceTempView("tmp_view_lines")
    val resultDataSet02: Dataset[Row] = spark.sql(
      """
        |with tmp as
        | (select explode(split(trim(value), "\\s+")) as word
        |from tmp_view_lines
        |where value is not null and length(trim(value)) > 0 )
        |select t.word ,count(1) as total
        |from tmp t
        |group by t.word
        |order by total desc
        |""".stripMargin)
    resultDataSet02.printSchema()
    resultDataSet02.show(5, truncate = false)

    //5.关闭上下文对象
    spark.stop();

  }

}
```

### SparkStreaming

- 前期准备：安装 netcat

```java
// 在Linux上安装 netcat
yum install nc -y
yum install nmap -y
// 向 9999 端口发送数据
nc -lk 9999
```

- Wordcount  by UpdateStateByKey

```scala
package com.test.day06.streaming

import org.apache.spark.streaming.dstream.{DStream, ReceiverInputDStream}
import org.apache.spark.streaming.{Seconds, StreamingContext}
import org.apache.spark.{SparkConf, SparkContext}

/**
 * @Desc: wordcount 案例，通过 UpdateStateByKey 实现宕机后状态恢复
 * 需要利用ncat 发数据， 
 */

object S4ocketWordcountUpdateStateByKeyRecovery {
    //设置路径
    val CKP ="src/main/data/ckp/"+this.getClass.getSimpleName.stripSuffix("$")
    //1.创建上下文对象, 指定批处理时间间隔为5秒
    val creatingFunc =()=>
    {
      val conf: SparkConf = new SparkConf()
        .setAppName(this.getClass.getSimpleName.stripSuffix("$"))
        .setMaster("local[*]")
      val sc = new SparkContext(conf)
      //2. 创建一个接收文本数据流的流对象
      val ssc = new StreamingContext(sc, Seconds(5))

      //3.设置checkpoint位置
      ssc.checkpoint(CKP)
      //4.接收socket数据
      val inputDStream: ReceiverInputDStream[String] = ssc.socketTextStream("node1", 9999)
      //TODO: 5.wordcount, 并做累计统计
      //自定义一个函数, 实现保存State状态和数据聚合
      //seq里面是value的数组,[1,1,], state是上次的状态, 累计值
      val updateFunc = (seq: Seq[Int], state: Option[Int]) => {
        if (!seq.isEmpty) {
          val this_value: Int = seq.sum
          val last_value: Int = state.getOrElse(0)
          val new_state: Int = this_value + last_value
          Some(new_state)
        }
        else {
          state
        }
      }
      //开始做wordcount,并打印输出
      val wordDStream: DStream[(String, Int)] = inputDStream.flatMap(_.split(" "))
        .map((_, 1))
        .updateStateByKey(updateFunc)
      wordDStream.print()
    ssc
    }

  def main(args: Array[String]): Unit = {
    val ssc: StreamingContext = StreamingContext.getOrCreate(CKP, creatingFunc)

    //启动流式应用
    ssc.start()
    //让应用一直处于监听状态
    ssc.awaitTermination()
    //合理关闭流式应用
    ssc.stop(true, true)

  }

}
```

### SparkStreaming & Kafka

- 自动提交 Offset

```scala
package com.test.day07.streaming

import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.common.serialization.StringDeserializer
import org.apache.spark.streaming.dstream.{DStream, InputDStream}
import org.apache.spark.streaming.{Seconds, StreamingContext}
import org.apache.spark.streaming.kafka010.{ConsumerStrategies, KafkaUtils, LocationStrategies}
import org.apache.spark.{SparkConf, SparkContext}
import scala.collection.mutable.Set

/**
 * @Desc: Spark  Kafka自动提交offset
 */
object S1KafkaAutoCommit {
  def main(args: Array[String]): Unit = {
    //创建上下文对象
    val conf = new SparkConf()
      .setAppName(this.getClass.getSimpleName.stripSuffix("$"))
      .setMaster("local[*]")
    val sc = new SparkContext(conf)
    val ssc = new StreamingContext(sc, Seconds(5))
    //准备kafka连接参数
    val kafkaParams = Map(
      "bootstrap.servers" -> "node1:9092,node2:9092,nodo3:9092",
      "key.deserializer" -> classOf[StringDeserializer], //key的反序列化规则
      "value.deserializer" -> classOf[StringDeserializer], //value的反序列化规则
      "group.id" -> "spark", //消费者组名称
      //earliest:表示如果有offset记录从offset记录开始消费,如果没有从最早的消息开始消费
      //latest:表示如果有offset记录从offset记录开始消费,如果没有从最后/最新的消息开始消费
      //none:表示如果有offset记录从offset记录开始消费,如果没有就报错
      "auto.offset.reset" -> "latest", //offset重置位置
      "auto.commit.interval.ms" -> "1000", //自动提交的时间间隔
      "enable.auto.commit" -> (true: java.lang.Boolean) //是否自动提交偏移量到kafka的专门存储偏移量的默认topic
    )

    val kafkaDStream: InputDStream[ConsumerRecord[String, String]] = KafkaUtils.createDirectStream[String, String](
      ssc,
      LocationStrategies.PreferConsistent,
      ConsumerStrategies.Subscribe[String, String](Set("spark_kafka"), kafkaParams)
    )
    //连接kafka, 拉取一批数据, 得到DSteam
    val resutDStream: DStream[Unit] = kafkaDStream.map(x => {
      println(s"topic=${x.topic()},partition=${x.partition()},offset=${x.offset()},key=${x.key()},value=${x.value()}")
    })
    //打印数据
    resutDStream.print()
    //启动并停留
    ssc.start()
    ssc.awaitTermination()
    //合理化关闭
    ssc.stop(stopSparkContext = true, stopGracefully = true)
  }

}
```

- 手动提交 Offset

```scala
package com.test.day07.streaming

import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.common.serialization.StringDeserializer
import org.apache.spark.streaming.dstream.{DStream, InputDStream}
import org.apache.spark.streaming.kafka010.{CanCommitOffsets, ConsumerStrategies, HasOffsetRanges, KafkaUtils, LocationStrategies, OffsetRange}
import org.apache.spark.streaming.{Seconds, StreamingContext}
import org.apache.spark.{SparkConf, SparkContext}

/**
 * @Desc: Spark  Kafka 手动提交 offset 到默认 topic
 */
object S2KafkaCommit {
  def main(args: Array[String]): Unit = {
    //创建上下文对象
    val conf = new SparkConf()
      .setAppName(this.getClass.getSimpleName.stripSuffix("$"))
      .setMaster("local[*]")
    val sc = new SparkContext(conf)
    val ssc = new StreamingContext(sc, Seconds(5))
    //准备kafka连接参数
    val kafkaParams = Map(
      "bootstrap.servers" -> "node1:9092,node2:9092,nodo3:9092",
      "key.deserializer" -> classOf[StringDeserializer], //key的反序列化规则
      "value.deserializer" -> classOf[StringDeserializer], //value的反序列化规则
      "group.id" -> "spark", //消费者组名称
      //earliest:表示如果有offset记录从offset记录开始消费,如果没有从最早的消息开始消费
      //latest:表示如果有offset记录从offset记录开始消费,如果没有从最后/最新的消息开始消费
      //none:表示如果有offset记录从offset记录开始消费,如果没有就报错
      "auto.offset.reset" -> "latest", //offset重置位置
      "auto.commit.interval.ms" -> "1000", //自动提交的时间间隔
      "enable.auto.commit" -> (false: java.lang.Boolean) //是否自动提交偏移量到kafka的专门存储偏移量的默认topic
    )

    val kafkaDStream: InputDStream[ConsumerRecord[String, String]] = KafkaUtils.createDirectStream[String, String](
      ssc,
      LocationStrategies.PreferConsistent,
      ConsumerStrategies.Subscribe[String, String](Set("spark_kafka"), kafkaParams)
    )
    //连接kafka, 拉取一批数据, 得到DSteam
    kafkaDStream.foreachRDD(rdd => {
      if (!rdd.isEmpty()) {
        //对每个批次进行处理
        //提取并打印偏移量范围信息
        val hasOffsetRanges: HasOffsetRanges = rdd.asInstanceOf[HasOffsetRanges]
        val offsetRanges: Array[OffsetRange] = hasOffsetRanges.offsetRanges
        println("它的行偏移量是: ")
        offsetRanges.foreach(println(_))
        //打印每个批次的具体信息
        rdd.foreach(x => {
          println(s"topic=${x.topic()},partition=${x.partition()},offset=${x.offset()},key=${x.key()},value=${x.value()}")
        })
        //手动将偏移量访问信息提交到默认主题
        kafkaDStream.asInstanceOf[CanCommitOffsets].commitAsync(offsetRanges)
        println("成功提交了偏移量信息")
      }
    })

    //启动并停留
    ssc.start()
    ssc.awaitTermination()
    //合理化关闭
    ssc.stop(true,   true)

  }

}
```

- 手动提交 Offset 到 MySQL
    - S3KafkaOffsetToMysql

    ```scala
    package com.test.day07.streaming
    
    import org.apache.kafka.clients.consumer.ConsumerRecord
    import org.apache.kafka.common.TopicPartition
    import org.apache.kafka.common.serialization.StringDeserializer
    import org.apache.spark.streaming.dstream.InputDStream
    import org.apache.spark.streaming.kafka010._
    import org.apache.spark.streaming.{Seconds, StreamingContext}
    import org.apache.spark.{SparkConf, SparkContext}
    
    import scala.collection.mutable
    
    /**
     * @Desc: Spark  Kafka 手动提交 offset 到默认 MySQL
     */
    object S3KafkaOffsetToMysql {
      def main(args: Array[String]): Unit = {
        //创建上下文对象
        val conf = new SparkConf()
          .setAppName(this.getClass.getSimpleName.stripSuffix("$"))
          .setMaster("local[*]")
        val sc = new SparkContext(conf)
        val ssc = new StreamingContext(sc, Seconds(5))
        //准备kafka连接参数
        val kafkaParams = Map(
          "bootstrap.servers" -> "node1:9092,node2:9092,nodo3:9092",
          "key.deserializer" -> classOf[StringDeserializer], //key的反序列化规则
          "value.deserializer" -> classOf[StringDeserializer], //value的反序列化规则
          "group.id" -> "spark", //消费者组名称
          //earliest:表示如果有offset记录从offset记录开始消费,如果没有从最早的消息开始消费
          //latest:表示如果有offset记录从offset记录开始消费,如果没有从最后/最新的消息开始消费
          //none:表示如果有offset记录从offset记录开始消费,如果没有就报错
          "auto.offset.reset" -> "latest", //offset重置位置
          "auto.commit.interval.ms" -> "1000", //自动提交的时间间隔
          "enable.auto.commit" -> (false: java.lang.Boolean) //是否自动提交偏移量到kafka的专门存储偏移量的默认topic
        )
        //去MySQL查询上次消费的位置
        val offsetMap: mutable.Map[TopicPartition, Long] = OffsetUtil.getOffsetMap("spark", "spark_kafka")
    
        //连接kafka, 拉取一批数据, 得到DSteam
        var kafkaDStream: InputDStream[ConsumerRecord[String, String]] = null
        //第一次查询, MySQL没有 offset 数据
        if (offsetMap.isEmpty) {
          kafkaDStream = KafkaUtils.createDirectStream[String, String](
            ssc,
            LocationStrategies.PreferConsistent,
            ConsumerStrategies.Subscribe[String, String](Set("spark_kafka"), kafkaParams) //第一次就看 Kafka 发啥
          )
        }
        //第二次查询, MySQL中有 offset 数据
        else {
          kafkaDStream = KafkaUtils.createDirectStream[String, String](
            ssc,
            LocationStrategies.PreferConsistent,
            ConsumerStrategies.Subscribe[String, String](Set("spark_kafka"), kafkaParams, offsetMap) //第二次开始就从 MySQL 获取
          )
        }
    
        //对每个批次进行处理
        kafkaDStream.foreachRDD(rdd => {
          if (!rdd.isEmpty()) {
            //提取并打印偏移量范围信息
            val hasOffsetRanges: HasOffsetRanges = rdd.asInstanceOf[HasOffsetRanges]
            val offsetRanges: Array[OffsetRange] = hasOffsetRanges.offsetRanges
            println("它的行偏移量是: ")
            offsetRanges.foreach(println(_))
            //打印每个批次的具体信息
            rdd.foreach(x => {
              println(s"topic=${x.topic()},partition=${x.partition()},offset=${x.offset()},key=${x.key()},value=${x.value()}")
            })
            //手动将偏移量访问信息提交到MySQL
            OffsetUtil.saveOffsetRanges("spark", offsetRanges)
            println("成功提交了偏移量到MySQL")
          }
        })
    
        //启动并停留
        ssc.start()
        ssc.awaitTermination()
        //合理化关闭
        ssc.stop(stopSparkContext = true, stopGracefully = true)
    
      }
    
    }
    ```

    - OffsetUtil

    ```scala
    package com.test.day07.streaming
    
    import org.apache.kafka.common.TopicPartition
    import org.apache.spark.streaming.kafka010.OffsetRange
    import scala.collection.mutable.Map
    
    import java.sql.{DriverManager, ResultSet}
    
    /**
     * @Desc: 定义一个单例对象, 定义 2 个方法
     *        方法1: 从 MySQL 读取行偏移量
     *        方法2: 将行偏移量保存的 MySQL
     */
    object OffsetUtil {
    
      /**
       * 定义一个单例方法, 将偏移量保存到MySQL数据库
       *
       * @param groupid     消费者组id
       * @param offsetRange 行偏移量对象
       */
      def saveOffsetRanges(groupid: String, offsetRange: Array[OffsetRange]) = {
        val connection = DriverManager.getConnection("jdbc:mysql://localhost:3306/d_spark",
          "root",
          "root")
        //replace into表示之前有就替换,没有就插入
        val ps = connection.prepareStatement("replace into t_offset (`topic`, `partition`, `groupid`, `offset`) values(?,?,?,?)")
        for (o <- offsetRange) {
          ps.setString(1, o.topic)
          ps.setInt(2, o.partition)
          ps.setString(3, groupid)
          ps.setLong(4, o.untilOffset)
          ps.executeUpdate()
        }
        ps.close()
        connection.close()
      }
    
      /**
       * 定义一个方法, 用于从 MySQL 中读取行偏移位置
       * @param groupid 消费者组id
       * @param topic   想要消费的数据主题
       */
      def getOffsetMap(groupid: String, topic: String) = {
    
        //1.从数据库查询对应数据
        val connection = DriverManager.getConnection("jdbc:mysql://localhost:3306/d_spark",
          "root",
          "root")
    
        val ps = connection.prepareStatement("select * from t_offset where groupid=?  and topic=?")
        ps.setString(1, groupid)
        ps.setString(2, topic)
        val rs: ResultSet = ps.executeQuery()
        //解析数据, 返回
        var offsetMap = Map[TopicPartition, Long]()
        while (rs.next()) {
          val topicPartition = new TopicPartition(rs.getString("topic"), rs.getInt("partition"))
    
          offsetMap.put(topicPartition, (rs.getLong("offset")))
        }
        rs.close()
        rs.close()
        connection.close()
        offsetMap
      }
    
    }
    ```

### StructuredStreaming

```scala
package com.test.day07.structuredStreaming

import org.apache.spark.sql.{DataFrame, Dataset, Row, SparkSession}
import org.apache.spark.sql.streaming.StreamingQuery
import org.apache.spark.sql.types.{IntegerType, StringType, StructField, StructType}

/**
 * @Desc: wordcount 案例 之 读取文件
 */
object S2StructuredStreamingTextFile {
  def main(args: Array[String]): Unit = {
    //1.创建上下文对象
    val spark: SparkSession = SparkSession.builder()
      .appName(this.getClass.getSimpleName.stripSuffix("$"))
      .master("local[*]")
      .config("spark.sql.shuffle.partitions", 4)
      .getOrCreate()
    //2.读取csv, 得到流式DataFrame, 每行就是每批次的行数据
    //自定义 Schema 信息
    val schema = new StructType(Array(
      StructField("name", StringType),
      StructField("age", IntegerType),
      StructField("hobby", StringType))
    )
    val inputDF: DataFrame = spark.readStream
      .format("csv")
      .option("sep", ";")
      .schema(schema)
      .load("src/main/data/input/persons")
    //3.进行wordcount, DSL风格
    inputDF.printSchema()
    //用 DSL 风格实现
    import spark.implicits._
    val DF: Dataset[Row] = inputDF.where("age<25")
      .groupBy("hobby")
      .count()
      .orderBy($"count".desc)

    // 用 SQL 风格实现
    inputDF.createOrReplaceTempView("t_spark")
    val DF2: DataFrame = spark.sql(
      """
        |select
        |hobby,
        |count(1) as cnt
        |from t_spark
        |where age<25
        |group by hobby
        |order by cnt desc
        |""".stripMargin)

    val query: StreamingQuery = DF.writeStream
      //append 默认追加 输出新的数据, 只支持简单查询, 有聚合就不能使用
      //complete:完整模式, 输出完整数据, 支持集合和排序
      //update: 更新模式, 输出有更新的数据,  支持聚合但是不支持排序
      .outputMode("complete")
      .format("console")
      .option("rowNumber", 10)
      .option("truncate", false)
      //4.启动流式查询
      .start()
    //5.驻留监听
    query.awaitTermination()
    //6.关闭流式查询
    query.stop()

  }

}
```

## FLink

### 批处理 DataSet

```java
package com.test.flink.start;

import org.apache.flink.api.common.functions.FilterFunction;
import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.operators.Order;
import org.apache.flink.api.java.ExecutionEnvironment;
import org.apache.flink.api.java.operators.*;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.util.Collector;

/**
 * @Author: Jface
 * @Date: 2021/9/5 12:37
 * @Desc: 基于Flink引擎实现批处理词频统计WordCount：过滤filter、排序sort等操作
 */
public class _01WordCount {
    public static void main(String[] args) throws Exception {
        //1.准备环境-env
        ExecutionEnvironment env = ExecutionEnvironment.getExecutionEnvironment();
        //2.准备数据-source
        DataSource<String> inputDataSet = env.readTextFile("datas/wc.input");
        //3.处理数据-transformation
        //TODO: 3.1 过滤脏数据
        AggregateOperator<Tuple2<String, Integer>> resultDataSet = inputDataSet.filter(new FilterFunction<String>() {
            @Override
            public boolean filter(String line) throws Exception {
                return null != line && line.trim().length() > 0;
            }
        })
                //TODO: 3.2 切割
                .flatMap(new FlatMapFunction<String, String>() {
                    @Override
                    public void flatMap(String line, Collector<String> out) throws Exception {
                        for (String s : line.trim().split("\\s+")) {
                            out.collect(s);
                        }
                    }
                })
                //TODO: 3.3 转换二元组
                .map(new MapFunction<String, Tuple2<String, Integer>>() {
                    @Override
                    public Tuple2<String, Integer> map(String word) throws Exception {
                        return Tuple2.of(word, 1);
                    }
                })
                //TODO: 3.4 分组求和
                .groupBy(0).sum(1);
        //4.输出结果-sink
        resultDataSet.printToErr();
        //TODO: sort 排序，全局排序需要设置分区数 1
        SortPartitionOperator<Tuple2<String, Integer>> sortDataSet = resultDataSet.sortPartition("f1", Order.DESCENDING)
                .setParallelism(1);
        sortDataSet.printToErr();
        //只选择前3的数据
        GroupReduceOperator<Tuple2<String, Integer>, Tuple2<String, Integer>> resultDataSet2 = sortDataSet.first(3);
        resultDataSet2.print();

        //5.触发执行-execute，没有写出不需要触发执行

    }
}
```

### 流处理 DataStream

```java
package com.test.stream;

import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.streaming.api.datastream.DataStreamSource;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.util.Collector;

/**
 * @Desc: 使用 FLink 计算引擎实现实时流式数据处理，监听端口并做 wordcount
 */
public class StreamWordcount {
    public static void main(String[] args) throws Exception {
         //1.准备环境-env
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
         //2.准备数据-source
        DataStreamSource<String> inputDataStream = env.socketTextStream("192.168.88.161", 9999);
        //3.处理数据-transformation
        //TODO: 切割成单个单词 flatmap
        SingleOutputStreamOperator<Tuple2<String, Integer>> resultDataSet = inputDataStream.flatMap(new FlatMapFunction<String, String>() {
            @Override
            public void flatMap(String value, Collector<String> out) throws Exception {
                String[] arr = value.trim().split("\\s+");
                for (String s : arr) {
                    out.collect(s);//将每个单词拆分出去
                }
            }
            //TODO: 单词--> 元组形式，map
        }).map(new MapFunction<String, Tuple2<String, Integer>>() {
            @Override
            public Tuple2<String, Integer> map(String value) throws Exception {
                return Tuple2.of(value,1);
            }
            //TODO: 分组聚合 keyBy & sum
        }).keyBy(0).sum(1);
        //4.输出结果-sink
        resultDataSet.print();
        //5.触发执行-execute
        env.execute(StreamWordcount.class.getSimpleName());
    }
}
```

流处理 Flink On Yarn

```java
package com.test.submit;

import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.api.java.utils.ParameterTool;
import org.apache.flink.streaming.api.datastream.DataStreamSource;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.util.Collector;

/**
 * @Desc: 使用 FLink 计算引擎实现流式数据处理，从socket 接收数据并做 wordcount
 */
public class Wordcount {
    public static void main(String[] args) throws Exception {
        //0.使用工具类，解析程序传递参数
        ParameterTool parameterTool = ParameterTool.fromArgs(args);
        if (parameterTool.getNumberOfParameters() != 2) {
            System.out.println("Usage: WordCount --host <host> --port <port> ............");
            System.exit(-1);
        }
        String host = parameterTool.get("host");
        parameterTool.getInt("port", 9999);
        //1.准备环境-env
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        //2.准备数据-source
        DataStreamSource<String> inputDataStream = env.socketTextStream("192.168.88.161", 9999);
        //3.处理数据-transformation
        //TODO: 切割成单个单词 flatmap
        SingleOutputStreamOperator<Tuple2<String, Integer>> resultDataStream = inputDataStream.flatMap(new FlatMapFunction<String, String>() {
            @Override
            public void flatMap(String value, Collector<String> out) throws Exception {
                String[] arr = value.trim().split("\\s+");
                for (String s : arr) {
                    out.collect(s);//将每个单词拆分出去
                }
            }
            //TODO: 单词--> 元组形式，map
        }).map(new MapFunction<String, Tuple2<String, Integer>>() {
            @Override
            public Tuple2<String, Integer> map(String value) throws Exception {
                return Tuple2.of(value, 1);
            }
            //TODO: 分组聚合 keyBy & sum
        }).keyBy(0).sum(1);
        //4.输出结果-sink
        resultDataStream.print();
        //5.触发执行-execute
        env.execute(Wordcount.class.getSimpleName());
    }
}
```

