---
title: Awk和Shell
date: 2021-06-10
description: 
tags: [Shell]
category: 存档
author: 惊羽
cover: /images/shell2.jpg
---
## awk

### 格式

- `awk [选项参数] 'script' var=value file(s)`
- 基本语法
    - $0 代表整个文本行
    - $1 代表文本行中的第 1 个数据字段
    - printf 打印输出
    - 默认每行按空格或TAB分割，使用$n来获取段号

### 段连接符OFS

- `awk '{OFS="#"}{print $1,$2,$3}' test_awk.txt`

### 指定分隔符 -F

- `awk -F ":" '{print $1}' test_awk2.txt`

### 内容匹配

- `格式'/这里写具体的正则表达式/'`
- 正则规则
    - 1、^linux 以linux开头的行
    - 2、$php 以php结尾的行
    - 3、. 匹配任意单字符
    - 4、.+ 匹配任意多个字符
    - 5、 .* 匹配0个或多个字符(可有可无)
    - 6、 [0-9a-z] 匹配中括号内任意一个字符
    - 7、 (linux)+ 出现多次Linux单词
    - 8、 (web){2} web出现两次以上
    - 9、\ 屏蔽转义
- 匹配到aaa或者ddd,就打印全部内容
    - `awk -F ':' '/aaa|ddd/ {print $0}' test_awk2.txt`

### 段内容判断

- 支持赋值,条件表达式,关系运算符等

### 段之间比较

- `awk -F ':' '$3<$4 {print $0}' test_awk2.txt`

### NR行号和NF段数

- 概念
    - NF段数
    - NR行号从1开始
    - nl命令在linux系统中用来计算文件中行号
    - `nl test_awk2.txt | head -2`
- 从test_awk2.txt前3行，把第1段内容替换为test，指定分隔符为|，显示行号
- `awk -F ':' '{OFS="|"} NR<=3 && $1="test" {print NR, $0}' test_awk2.txt`

### 分段求和

- 格式
    - BEGIN{} {} END{}
    - BEGIN{}在读取数据之前做的事情, 可以理解为: 前.
    - {} 在读取过程中做的事情, 可以理解为: 中.
    - END{} 在读取数据之后做的事情, 可以理解为: 后.
- 对test_awk2.txt中的第2段求和
    - `awk -F ':' 'BEGING{}{total=total+$2}END{print total}' test_awk2.txt`
    - `awk -F ':' 'BEGIN{}{total=total+$2}END{print total}' test_awk2.txt`

### 综合案例

- 统计当前目录所有文本文件的大小

```bash
awk 'BEGIN{}{total=total+$5} END{print(total)}'
```

- 打印99乘法表

```bash
awk 'BEGIN{ for(i=1;i<=9;i++){ for(j=1;j<=i;j++){ printf("%dx%d=%d%s", i, j, i*j, "\t" ) } printf("\n") } }'
```

- 求总成绩

文本文件

```
Marry    2143 78 84 77
Jack     2321 66 78 45
Tom     2122 48 77 71
Mike     2537 87 97 95
Bob      2415 40 57 62
```

脚本文件

```shell
#!/bin/awk -f
#运行前
BEGIN {
    math = 0
    english = 0
    computer = 0
 
    printf "NAME    NO.   MATH  ENGLISH  COMPUTER   TOTAL\n"
    printf "---------------------------------------------\n"
}
#运行中
{
    math+=$3
    english+=$4
    computer+=$5
    printf "%-6s %-6s %4d %8d %8d %8d\n", $1, $2, $3,$4,$5, $3+$4+$5
}
#运行后
END {
    printf "---------------------------------------------\n"
    printf "  TOTAL:%10d %8d %8d \n", math, english, computer
    printf "AVERAGE:%10.2f %8.2f %8.2f\n", math/NR, english/NR, computer/NR
}
```

## shell编程

### 基本介绍

- shell脚本执行方式Shell 是一个用 C 语言编写的程序，通过 Shell 用户可以访问操作系统内核服务。
- 查看系统安装 `shellcat /etc/shells`
- 查看Linux系统默认的SHELL解释器的`echo $SHELL`

### 格式

- `#!/bin/bash`

### 4种运行方式

- sh执行
- 工作目录执行
- 绝对路径执行
- source hello.sh

### 变量

- 用户变量
- 环境变量
- 特殊变量
- $#命令行参数的个数
- $n 表示第n个参数
- $0 当前程序的名称
- $? 前一个命令或许或函数的返回码
- $*以“参数1 参数2 。。。”形式保存所有参数
- $@ 以“参数1”“参数2”。。。形式保存所有参数
- $$ 本程序的（进程ID号）PID
- $! 上一个命令的PID

### 字符串

- 优先使用双引号
- 拼接字符串
- `wenhou_1="你好,$yourname ."`
- `wenhou_2="你好,"$yourname" ."`
- `wenhou_3="你好,\"$yourname\" ."`
- 获取字符串长度

```bash
#!/bin/bash
string="jobs"
echo ${string}    # 输出结果: jobs
echo ${#string}   # 输出结果: 4
```

- 提取子字符串

```bash
#!/bin/bash
string="敢于亮剑决不后退"
echo ${string:2:2}    # 输出结果为: 亮剑
```

- 查找字符串（记得有漂号）

```bash
#!/bin/bash
string="i am a boy"
echo `expr index "$string" am`
```

### 算术运算符

- 支持包括：算术、关系、布尔、字符串等运算符

### 流程控制

- 数字语句判断
    - -eq 检测两个数是否相等，相等返回 true。
    - -ne检测两个数是否不相等，不相等返回 true。
    - gt检测左边的数是否大于右边的，如果是，则返回 true。
    - lt检测左边的数是否小于右边的，如果是，则返回 true。
    - -ge检测左边的数是否大于等于右边的，如果是，则返回 true。
    - -le检测左边的数是否小于等于右边的，如果是，则返回 true。
- 字符串语句判断
    - n STRING 字符串长度不为零
    - z STRING 字符串长度为0
    - = 判断两个字符串是否一样
    - !=判断两个字符串是否不一样
- 文件语句判断
    - f 存在且是普通文件
    - -d 存在且是目录
    - h 存在且是符号链接
    - e 文件存在
    - –r 文件存在并且可读
    - –w 文件存在并且可写
    - –x 文件存在并且可执行
- test命令：可以代替[]
    - 为0表示为真，为1表示为假
- let命令：执行一个或多个表达式
- if语句格式

```bash
if condition    //条件, 条件要用 [] 包裹.             
then                
command1     //符合条件后, 就会执行这里的内容                
command2                
...                
commandN             
fi
```

- if else 语法格式

```bash
if condition    //条件, 用[]包裹        
then           
 command1    //符合条件后, 执行的内容            
command2           
...            
commandN        
else           
 command        //不符合条件后, 执行的内容.         
fi
```

- if else-if else

```bash
if  condition1        //条件1        
then            
command1        //满足条件1后, 执行的内容        
elif  condition2     //条件2        
then             
command2        //满足条件2后, 执行的内容        
else            
commandN        //所有条件都不满足, 则执行这里.        
fi
```

- 第一种for循环

```bash
for 变量 in 值1 值2 值3…            
do            
程序            
done
```

- 第二种for循环

```bash
for ((初始值；循环控制条件；变量变化))           
 do            
程序            
done
```

- while循环

```bash
while 条件        
do            
程序        
done
```

- 死循环

```bash
# 方式1
while :

# 方式2
while true

# 方式3
for ((;;))
```

- case判断语句

```bash
case 值  in        
模式1)            
command1            
command2           
 ...            
commandN            
;;        
模式2）            
command1            
command2           
 ...            
commandN            
;;       
 esac
```

- 跳出循环break和continue操作

### 函数

- 语法格式

```bash
[ function ] funname(){            
action;            
[return int;]        
}
```

- 格式解释
  
    1. 可以带function fun() 定义，也可以直接fun() 定义,不带任何参数。 
    
    2. 参数返回，可以显示加：return 返回，如果不加，将以最后一条命令运行结果，作为返回值。 return后跟数值n(0-255）
    
- 注意事项
  
    1. 函数返回值在调用该函数后通过 $? 来获得。 
    
    2. 所有函数在使用前必须定义。这意味着必须将函数放在脚本开始部分，直至shell解释器首次发现它时，才可以使用。 调用函数仅使用其函数名即可。 
    
    3. 函数的返回值只能是0-255区间的数据, 否则返回的内容可能不是我们想要的结果.  一般定义一个函数, 是为了实现特殊的功能, 当这个功能执行完成后, 返回一个状态信息. 0成功, 1失败等, 我们根据这个信息再来做其他的操作即可. 
    
    4. $? 严格意义来讲并不是获取返回值的, 而是获取上一个的执行后状态码信息(0-255之间)默认情况下如果状态码为0 表示成功执行, 如果为其他值, 则表示执行有问题
    
- 如何具体接收方法返回值的问题
    - 在方法外定义变量
    - 用输出语句输出,在方法外用变量接收该值
- 有参数的函数操作
    - $1表示第一个参数,以此类推

### 数组

- 定义数组
  
    ```bash
    my_array=(A B "C" D)
    array_name[0]=value0
    array_name[1]=value1
    array_name[2]=value2
    ```
    
- 读取数组
  
    ```bash
    echo "第一个元素为: ${my_array[0]}"
    ```
    
- 获取数组所有元素
  
    ```bash
    echo "数组的全部元素为: ${my_array[*]}"
    echo "数组的全部元素为: ${my_array[@]}"
    ```
    
- 获取数组长度
  
    ```bash
    echo "数组元素个数为: ${#my_array[*]}"
    echo "数组元素个数为: ${#my_array[@]}"
    ```
    
- 遍历数组:结合2中for循环

### select语句

- 概念
    - 擅长于交互式场合。用户可以从一组不同的值中进行选择.
- `格式PS3= //界面提示符select var in ... ; do　commond done  .... now $var can be used ...`
- 注意事项:break 命令退出循环，或exit 命令终止脚本

### 加载其它变量

- 格式1：`. filename`
- 格式2：`source filename` （推荐使用）

### 综合案例

- 1.猜数字小游戏

```bash
#!/bin/bash
#生成100以内的随机数 提示用户猜测 猜对为止
#random 系统自带，值为0-32767任意数
#随机数1-100
num=$[RANDOM%100+1]
#read 提示用户猜数字
#if判断
while  :
do
	read -p "计算机生成了一个 1‐100 的随机数,你猜: " cai
    if [ $cai -eq $num ]
    then
       	echo "恭喜,猜对了"
       	exit
    	elif [ $cai -gt $num ]
    	then
           	echo "不巧,猜大了"
      	else
           	echo "不巧,猜小了"
 	fi
done
```

- 2.数据库定时备份

```bash
#!/bin/bash
#完成数据库的定时备份
#备份的路径
BACKUP=/export/data/db
#当前时间作为文件名
DATETIME=$(date +%Y_%m_%d_%H%M%S)
#可以通过输出变量来调试
echo $DATETIME
#使用变量的时候，也可以用{}花括号的方式把变量名包起来，如下：
echo ${DATETIME}
 
echo "---------------------开始备份数据库---------------------"
echo "---------------------备份的路径是$BACKUP/$DATETIME.tar.gz---------------------"
#主机ip地址
HOST=192.168.88.100
#数据库用户名
DB_USER=root
#数据库密码
DB_PWD=123456
#数据库名
DATABASE=test_shop
#创建备份路径
#如果备份的文件夹路径存在的话，就直接使用，否则就创建
[ ! -d "${BACKUP}/${DATETIME}" ] && mkdir -p "${BACKUP}/${DATETIME}"
#执行mysql的备份数据库的指令
mysqldump -u${DB_USER} -p${DB_PWD} --host=${HOST} ${DATABASE} | gzip > ${BACKUP}/${DATETIME}/${DATETIME}.sql.gz
#打包备份文件
cd ${BACKUP}
tar -czvf ${DATETIME}.tar.gz ${DATETIME}
#删除临时目录
rm -rf ${BACKUP}/${DATETIME}
#删除10天前的备份文件
find ${BACKUP} -mtime +10 -name "*.tar.gz" -exec rm -rf {} \;
echo "-------------------------备份成功-------------------------"
```

## 小技巧总结

### 给变量赋值的特殊写法

```bash
	a=`Linux命令`
	a=$(Linux命令)		
# 这两个命令的执行结果是一样的, 都是把Linux命令的执行结果给变量
```

### 关于数字的运算

```bash
	$((10 + 20))
	$[10 + 20]
	`expr 10 + 20 `
```

### 关于for, while的条件

```bash
如果是 for(()) 或者 while (()) 这种方式, 不用通过$引入变量, 可以直接用.
如果是 for[] 或者 while[]这种方式, 必须通过$引入变量, 才可以继续使用.
```