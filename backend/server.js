const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();  // 引入 dotenv 以便使用环境变量

// 初始化Express
const app = express();
const port = process.env.PORT || 5000; // 使用环境变量配置端口

// 配置中间件
app.use(cors());
app.use(bodyParser.json());

// 连接MongoDB数据库
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/memoApp', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error: ", err));

// 定义任务Schema
const TaskSchema = new mongoose.Schema({
  category: String,
  task: String,
  deadline: Date,
  isCompleted: Boolean,
  createdAt: { type: Date, default: Date.now },
  startTime: Date,  // 可选：开始时间
  endTime: Date     // 可选：结束时间
});

// 创建任务模型
const Task = mongoose.model('Task', TaskSchema);

/* ==================== 新增部分开始 ==================== */

// 定义网页信息Schema
const WebInfoSchema = new mongoose.Schema({
  name: String,
  url: String,
  category: String,
  hasUpdate: { type: Boolean, default: false },
  lastChecked: { type: Date, default: Date.now },
  contentHash: String, 
  createdAt: { type: Date, default: Date.now }
});


// 创建网页信息模型
const WebInfo = mongoose.model('WebInfo', WebInfoSchema);

// 路由：添加网页信息
app.post('/api/webinfos', async (req, res) => {
  try {
    const { name, url, category } = req.body;
    const newWebInfo = new WebInfo({ name, url, category });
    const savedWebInfo = await newWebInfo.save();
    res.status(200).json(savedWebInfo);
  } catch (error) {
    console.error('保存网页信息时出错:', error);
    res.status(500).send(error);
  }
});

// 路由：获取所有网页信息
app.get('/api/webinfos', async (req, res) => {
  try {
    const webInfos = await WebInfo.find({});
    res.status(200).json(webInfos);
  } catch (error) {
    console.error('获取网页信息时出错:', error);
    res.status(500).send(error);
  }
});

// 路由：删除网页信息
app.delete('/api/webinfos/:id', async (req, res) => {
  try {
    const webInfo = await WebInfo.findByIdAndDelete(req.params.id);
    if (!webInfo) {
      return res.status(404).send('WebInfo not found');
    }
    res.status(200).send('WebInfo deleted');
  } catch (error) {
    console.error('删除网页信息时出错:', error);
    res.status(500).send(error);
  }
});

// 路由：更新网页信息（标记为已读）
app.put('/api/webinfos/:id/markAsRead', async (req, res) => {
  try {
    const webInfo = await WebInfo.findByIdAndUpdate(
      req.params.id,
      { hasUpdate: false },
      { new: true }
    );
    if (!webInfo) {
      return res.status(404).send('WebInfo not found');
    }
    res.status(200).json(webInfo);
  } catch (error) {
    console.error('更新网页信息时出错:', error);
    res.status(500).send(error);
  }
});

// 路由：手动触发更新所有网页信息的状态
app.get('/api/webinfos/update', async (req, res) => {
  try {
    // 这里假设有一个函数 checkForUpdates 来检测网页是否有更新
    const webInfos = await WebInfo.find({});
    for (let webInfo of webInfos) {
      const hasUpdate = await checkForUpdates(webInfo.url); // 需要您实现
      await WebInfo.findByIdAndUpdate(webInfo._id, { hasUpdate, lastChecked: new Date() });
    }
    const updatedWebInfos = await WebInfo.find({});
    res.status(200).json(updatedWebInfos);
  } catch (error) {
    console.error('更新网页状态时出错:', error);
    res.status(500).send(error);
  }
});

/* ==================== 新增部分结束 ==================== */

// 路由：添加任务
app.post('/api/tasks', async (req, res) => {
  try {
    const { category, task, deadline } = req.body;
    const newTask = new Task({ category, task, deadline, isCompleted: false });
    const savedTask = await newTask.save();
    res.status(200).json(savedTask);
  } catch (error) {
    console.log('保存任务时出错:', error);
    res.status(500).send(error);
  }
});

// 路由：获取任务
app.get('/api/tasks', (req, res) => {
  Task.find({}, (err, tasks) => {
    if (err) return res.status(500).send({ message: "Error fetching tasks", error: err });
    res.status(200).json(tasks);
  });
});

// 路由：获取任务按类别（可选）
app.get('/api/tasks/category/:category', (req, res) => {
  Task.find({ category: req.params.category }, (err, tasks) => {
    if (err) return res.status(500).send({ message: "Error fetching tasks by category", error: err });
    res.status(200).json(tasks);
  });
});

// 路由：删除任务
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).send('Task not found');
    }
    res.status(200).send('Task deleted');
  } catch (err) {
    res.status(500).send(err);
  }
});

// 路由：更新任务完成状态
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { isCompleted: req.body.isCompleted },
      { new: true } // 返回更新后的任务
    );
    if (!task) {
      return res.status(404).send('Task not found');
    }
    res.status(200).json(task);
  } catch (err) {
    res.status(500).send(err);
  }
});

// 路由：更新任务的其他信息
app.put('/api/tasks/:id/update', (req, res) => {
  const { category, task, deadline, startTime, endTime } = req.body;
  Task.findByIdAndUpdate(
    req.params.id,
    { category, task, deadline, startTime, endTime },
    { new: true },
    (err, task) => {
      if (err) return res.status(500).send({ message: "Error updating task", error: err });
      res.status(200).json(task);
    }
  );
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// 辅助函数：检查网页是否有更新（需要您实现实际的爬虫逻辑）
async function checkForUpdates(url) {
  // 这里需要实现爬虫逻辑，访问指定的 URL，检查内容是否有变化
  // 这是一个占位函数，返回随机布尔值
  // 实际应用中，您需要用实际的逻辑替换此部分
  return Math.random() < 0.5;
}

const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// 辅助函数：检查网页是否有更新
async function checkForUpdates(webInfo) {
  try {
    const { url, contentHash: previousHash } = webInfo;

    // 1. 获取网页内容
    const response = await axios.get(url);
    const html = response.data;

    // 2. 解析网页内容，提取主要内容
    const $ = cheerio.load(html);

    // 假设我们提取页面主体内容，例如 <body> 标签内的文本
    const mainContent = $('body').text();

    // 3. 计算内容的哈希值
    const currentHash = crypto.createHash('md5').update(mainContent).digest('hex');

    // 4. 比较新旧哈希值
    const hasUpdate = previousHash !== currentHash;

    // 5. 更新数据库中的内容哈希和状态
    await WebInfo.findByIdAndUpdate(webInfo._id, {
      hasUpdate,
      contentHash: currentHash,
      lastChecked: new Date()
    });

    return hasUpdate;
  } catch (error) {
    console.error(`检查 ${webInfo.url} 时出错：`, error);
    return false; // 出错时默认返回无更新
  }
}




