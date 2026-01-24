---
title: 管理配置文件的工具：Commons Configuration
date: 2020-10-20
description: 
tags: [Java, Flink]
category: 日常工作
author: 惊羽
cover: /images/configuration.jpg
---
一般读取配置文件，或者说集群环境传参的方式有如下几种：

1、Main 程序留出参数入口，通过 args 接收参数，运行 jar 的时候传入参数

2、将配置文件放入 resources ，通过类加载器获取参数文件，或者创建专门工具类读取resources 中的配置文件信息

这两种方法各有优缺点，第一种虽然修改参数非常方便，但是当需要指定的参数较多时会繁琐；

第二种方式将配置文件一起打成 jar 包，当需要修改参数信息的时需要重写打包，也非常繁琐。

最近项目当中使用了一种的新的工具：Apache Commons Configuration，完美解决了我的需求

## Commons Configuration 基本介绍

Commons Configuration 软件库提供了一个通用配置接口，它使 Java 应用程序能够从各种来源读取配置数据。

支持各种格式的配置文件

- Properties files
- XML documents
- Windows INI files
- Property list files (plist)
- JNDI
- JDBC Datasource
- System properties
- Applet parameters
- Servlet parameters

官网：[https://commons.apache.org/proper/commons-configuration/](https://commons.apache.org/proper/commons-configuration/) 

### Maven 依赖

```xml
<dependencies>
    <!-- https://mvnrepository.com/artifact/org.apache.commons/commons-configuration2 -->
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-configuration2</artifactId>
        <version>2.2</version>
    </dependency>
    <dependency>
            <groupId>commons-beanutils</groupId>
            <artifactId>commons-beanutils</artifactId>
            <version>1.9.3</version>
    </dependency>
    </dependencies>
```

### 新建 test.propertis 文件

```
### common configuration start
database.host = db.acme.com
database.port = 8199
database.user = admin
database.password = ???
database.timeout = 60000
###common configuration end
```

### 读取测试

```java
package com.test;

import org.apache.commons.configuration2.Configuration;
import org.apache.commons.configuration2.builder.fluent.Configurations;
import org.apache.commons.configuration2.ex.ConfigurationException;

import java.io.File;

/**
 * @Author: Jface
 * @Desc: 测试 Commons Configuration 的使用
 */
public class PropertiesFile {
    public static void main(String[] args) {
        //1.初始化配置文件
        Configurations configs = new Configurations();
        Configuration config = null;
        //2.读取配置文件内容
        try {
            config = configs.properties(new File("commons_configuration/src/main/resources/test.properties"));

        } catch (ConfigurationException cex) {
            cex.printStackTrace();
        }

        //2.获取使用配置文件信息,打印测试
        System.out.println(config.getString("database.host"));

    }
}
```

参考资料

[https://www.jianshu.com/p/625e833c1a49](https://www.jianshu.com/p/625e833c1a49) 

[https://blog.csdn.net/wanghantong/article/details/79072474](https://blog.csdn.net/wanghantong/article/details/79072474)