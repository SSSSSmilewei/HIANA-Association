# Inheritance

<!-- video: xfZhb6lmxjk -->
[▶ 视频](https://www.youtube.com/watch?v=xfZhb6lmxjk)

## 要解决的问题

一个人的血型由两个等位基因（allele，即同一基因的不同形式）决定。三种可能的等位基因是 A、B 和 O，每个人带有其中两个（可能相同，也可能不同）。孩子的父母双方各自随机把自己两个血型等位基因中的一个传给孩子。因此，可能的血型组合有：OO、OA、OB、AO、AA、AB、BO、BA 和 BB。

例如，如果一位家长的血型是 AO，另一位家长的血型是 BB，那么孩子可能的血型是 AB 和 OB，取决于从双方家长各得到哪个等位基因。同样，如果一位家长的血型是 AO，另一位是 OB，那么孩子可能的血型是 AO、OB、AB 和 OO。

在名为 `inheritance` 的文件夹中，创建名为 `inheritance.c` 的文件，模拟一个家庭中每位成员血型的遗传。

## 演示

## 发行代码

这道题要求你扩展 CS50 课程组提供给你的代码的功能。

<details markdown="1"><summary>下载发行代码</summary>

登录 [cs50.dev](https://cs50.dev/)，点击你的终端窗口，单独执行 `cd`。你应该会发现终端窗口的提示符类似下面这样：

```
$
```

接着执行

```
wget https://cdn.cs50.net/2026/x/psets/5/inheritance.zip
```

把名为 `inheritance.zip` 的 ZIP 文件下载到你的 codespace 中。

然后执行

```
unzip inheritance.zip
```

创建一个名为 `inheritance` 的文件夹。你不再需要这个 ZIP 文件了，所以可以执行

```
rm inheritance.zip
```

并在提示时输入“y”后按回车，删除你下载的 ZIP 文件。

现在输入

```
cd inheritance
```

再按回车，进入（即打开）该目录。你的提示符现在应该类似下面这样。

```
inheritance/ $
```

单独执行 `ls`，你应该会看到一个名为 `inheritance.c` 的文件。

如果遇到任何问题，请重新按这些步骤操作一遍，看看能否找出哪里出了错！

</details>

## 实现细节

补全 `inheritance.c` 的实现，使它能创建指定代数的家庭，并为每位家庭成员分配血型等位基因。最年长的一代将被随机分配等位基因。

- 
  create_family
  
  函数接受一个整数（
  
  generations
  
  ）作为输入，并应为这么多代的家庭中的每位成员分配（例如通过
  
  malloc
  
  ）一个
  
  person
  
  ，返回指向最年轻一代中那个
  
  person
  
  的指针。
  
  - 例如，`create_family(3)` 应返回一个指针，指向一个有两位父母的人，而这两位父母各自也有两位父母。
  - 每个 `person` 都应被分配 `alleles`。最年长的一代应随机选择等位基因（例如通过调用 `random_allele` 函数），更年轻的各代则应从每位家长那里各继承一个等位基因（随机选择）。
  - 每个 `person` 都应被分配 `parents`。最年长的一代应将两个 `parents` 都设为 `NULL`，更年轻的各代则应让 `parents` 是一个包含两个指针的数组，每个指针指向不同的家长。

## 提示

<details markdown="1"><summary>理解 `inheritance.c` 中的代码</summary>

看一看 `inheritance.c` 中的发行代码。

注意名为 `person` 的类型的定义。每个人都有一个包含两个 `parents` 的数组，其中每个元素都是指向另一个 `person` 结构体的指针。每个人还有一个包含两个 `alleles` 的数组，其中每个元素是一个 `char`（`'A'`、`'B'` 或 `'O'`）。

```
// Each person has two parents and two alleles
typedef struct person
{
    struct person *parents[2];
    char alleles[2];
}
person;
```

现在看一看 `main` 函数。函数一开始先为随机数生成器“播种”（即提供一些初始输入），我们稍后会用它来生成随机的等位基因。

```
// Seed random number generator
srandom(time(0));
```

然后 `main` 函数调用 `create_family` 函数，模拟为一个 3 代家庭（即一个人、他的父母和他的祖父母/外祖父母）创建 `person` 结构体。

```
// Create a new family with three generations
person *p = create_family(GENERATIONS);
```

接着我们调用 `print_family`，打印出每位家庭成员及其血型。

```
// Print family tree of blood types
print_family(p, 0);
```

最后，函数调用 `free_family`，`free` 掉之前用 `malloc` 分配的所有内存。

```
// Free memory
free_family(p);
```

`create_family` 和 `free_family` 函数留给你来编写！

</details>

<details markdown="1"><summary>补全 `create_family` 函数</summary>

`create_family` 函数应返回一个指向 `person` 的指针，这个人的血型是从输入所给的 `generations` 代之中遗传而来的。

- 首先注意，这道题是练习递归的好机会。
  
  - 要确定当前这个人的血型，你需要先确定他父母的血型。
  - 要确定这些父母的血型，你必须先确定<em>他们</em>父母的血型。依此类推，直到你到达想要模拟的最后一代。

要解决这道题，你会在发行代码中看到若干 TODO。

首先，你应该为新的 person 分配内存。回忆一下，你可以用 `malloc` 分配内存，用 `sizeof(person)` 得到要分配的字节数。

```
// Allocate memory for new person
person *new_person = malloc(sizeof(person));
```

接下来，你应该检查是否还有需要创建的世代：也就是说，`generations > 1` 是否成立。

如果 `generations > 1`，说明还有更多世代需要分配。我们已经通过递归调用 `create_family` 创建了两位新的家长 `parent0` 和 `parent1`。然后你的 `create_family` 函数应设置你所创建的新 person 的父母指针。最后，为新 person 的两个 `alleles` 赋值，方法是从每位家长那里各随机选取一个等位基因。

- 记住，要通过指针访问变量，可以使用箭头记法。例如，如果 `p` 是指向某个人的指针，那么指向这个人第一位家长的指针可以通过 `p->parents[0]` 访问。
- 你可能会觉得 `random()` 函数对随机分配等位基因很有用。这个函数返回一个介于 `0` 和 `RAND_MAX`（即 `32767`）之间的整数。具体来说，要生成一个不是 `0` 就是 `1` 的伪随机数，可以使用表达式 `random() % 2`。

```
// Create two new parents for current person by recursively calling create_family
person *parent0 = create_family(generations - 1);
person *parent1 = create_family(generations - 1);

// Set parent pointers for current person
new_person->parents[0] = parent0;
new_person->parents[1] = parent1;

// Randomly assign current person's alleles based on the alleles of their parents
new_person->alleles[0] = parent0->alleles[random() % 2];
new_person->alleles[1] = parent1->alleles[random() % 2];
```

假设没有更多世代需要模拟了，也就是 `generations == 1`。那么这个人就没有父母的数据。你的新 person 的两位家长都应设为 `NULL`，并且每个 `allele` 都应随机生成。

```
// Set parent pointers to NULL
new_person->parents[0] = NULL;
new_person->parents[1] = NULL;

// Randomly assign alleles
new_person->alleles[0] = random_allele();
new_person->alleles[1] = random_allele();
```

最后，你的函数应返回指向所分配的那个 `person` 的指针。

```
// Return newly created person
return new_person;
```

</details>

<details markdown="1"><summary>补全 `free_family` 函数</summary>

`free_family` 函数应接受一个指向 `person` 的指针作为输入，释放这个人的内存，然后递归地释放他所有祖先的内存。

- 由于这是一个递归函数，你应该先处理基线情况（base case）。如果函数的输入是 `NULL`，那就没有什么需要释放的，所以你的函数可以立即返回。
- 否则，你应该先递归地 `free` 这个人的两位家长，再 `free` 孩子。

下面几乎就是答案了，不过方法就是这样！

```
// Free `p` and all ancestors of `p`.
void free_family(person *p)
{
    // Handle base case
    if (p == NULL)
    {
        return;
    }

    // Free parents recursively
    free_family(p->parents[0]);
    free_family(p->parents[1]);

    // Free child
    free(p);
}
```

</details>

### 讲解视频

<!-- video: 9p7ddI3ozTY -->
[▶ 视频](https://www.youtube.com/watch?v=9p7ddI3ozTY)

<details markdown="1"><summary>不知道怎么解决？</summary>

</details>

## 如何测试

运行 `./inheritance` 时，你的程序应遵守背景中描述的规则。孩子应有两个等位基因，各来自一位家长。每位家长也应各有两个等位基因，分别来自他们各自的父母。

例如，在下面的示例中，第 0 代的孩子从第 1 代的两位家长那里都得到了 O 等位基因。第一位家长从第一位祖辈那里得到了 A，从第二位祖辈那里得到了 O。同样，第二位家长从他们的祖辈那里得到了 O 和 B。

```
$ ./inheritance
Child (Generation 0): blood type OO
    Parent (Generation 1): blood type AO
        Grandparent (Generation 2): blood type OA
        Grandparent (Generation 2): blood type BO
    Parent (Generation 1): blood type OB
        Grandparent (Generation 2): blood type AO
        Grandparent (Generation 2): blood type BO
```

### 正确性

```
check50 cs50/problems/2026/x/inheritance
```

### 代码风格

```
style50 inheritance.c
```

## 如何提交

在终端中执行下面的命令来提交你的作业，并回答随后出现的提示。

```
submit50 cs50/problems/2026/x/inheritance
```
