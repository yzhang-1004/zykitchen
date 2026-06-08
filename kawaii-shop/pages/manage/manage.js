const app = getApp();
const db = require('../../utils/db');
const upload = require('../../utils/upload');
const _ = db._;

Page({
  data: {
    // Tab配置
    tabs: [
      { name: '全部', icon: '🍽️', value: 'all' },
      { name: '肉菜', icon: '🥩', value: 'meat' },
      { name: '素菜', icon: '🥬', value: 'vegetable' },
      { name: '面食', icon: '🍜', value: 'noodle' }
    ],
    activeTab: 0,
    
    // 菜品数据
    allDishes: [],
    currentDishes: [],
    
    // 弹窗控制
    showModal: false,
    isEditMode: false,
    
    // 待做菜品
    todoOrders: [],
    todoExpandIndex: -1,
    
    // 表单数据
    formData: {
      _id: null,  // 云数据库ID
      id: null,
      name: '',
      category: 'meat',
      categoryName: '肉菜',
      description: '',
      images: [],
      recipe: '',
      recipeImages: []
    }
  },

  onShow() {
    // 注册数据加载完成回调
    app.onDataLoaded(() => {
      this.loadDishes();
      this.loadTodoOrders();
    });
  },
  
  // 下拉刷新
  async onPullDownRefresh() {
    try {
      // 从云端重新加载数据
      await app.refreshData();
      
      // 刷新页面数据
      this.loadDishes();
      this.loadTodoOrders();
      
      // 停止下拉刷新动画
      wx.stopPullDownRefresh();
      
      // 显示成功提示
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1000
      });
    } catch (err) {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
      console.error('刷新失败:', err);
    }
  },

  // 加载待做菜品
  loadTodoOrders() {
    const todoOrders = app.globalData.todoOrders || [];
    this.setData({ todoOrders: todoOrders });
  },

  // 展开/折叠待做菜品菜谱
  toggleTodoRecipe(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      todoExpandIndex: this.data.todoExpandIndex === index ? -1 : index
    });
  },

  // 完成待做菜品（做菜得星星）
  async completeTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todoOrders = app.globalData.todoOrders || [];
    const item = todoOrders.find(t => t.id === id);
    if (!item) return;

    wx.showLoading({ title: '烹饪中...', icon: 'none' });
    
    try {
      // 获得星星
      app.globalData.starCount = (app.globalData.starCount || 0) + 1;
      
      // 更新菜品被做次数
      const dishes = app.globalData.dishes || [];
      const dishIdx = dishes.findIndex(d => d.id === item.dish.id);
      if (dishIdx !== -1) {
        dishes[dishIdx].cookCount = (dishes[dishIdx].cookCount || 0) + 1;
        app.globalData.dishes = dishes;
        
        // 同步到云端
        if (dishes[dishIdx]._id) {
          await db.update('dishes', dishes[dishIdx]._id, {
            cookCount: dishes[dishIdx].cookCount
          });
        }
      }
      
      // 添加烹饪记录
      const cookHistory = app.globalData.cookHistory || [];
      cookHistory.unshift({
        dishName: item.dishName,
        dishId: item.dish.id,
        time: new Date().toLocaleString('zh-CN'),
        stars: 1
      });
      // 只保留最近100条
      if (cookHistory.length > 100) {
        cookHistory = cookHistory.slice(0, 100);
      }
      app.globalData.cookHistory = cookHistory;
      
      // 更新或创建统计数据
      const statsRes = await db.get('user_stats');
      if (statsRes.success && statsRes.data.length > 0) {
        await db.update('user_stats', statsRes.data[0]._id, {
          starCount: app.globalData.starCount,
          cookHistory: cookHistory
        });
      } else {
        await db.add('user_stats', {
          starCount: app.globalData.starCount,
          cookHistory: cookHistory
        });
      }
      
      // 从待做列表移除
      const newTodos = todoOrders.filter(t => t.id !== id);
      app.globalData.todoOrders = newTodos;
      
      // 从云端删除待做订单
      const todoRes = await db.get('todo_orders', { id: id });
      if (todoRes.success && todoRes.data.length > 0) {
        await db.remove('todo_orders', todoRes.data[0]._id);
      }
      
      this.setData({ todoOrders: newTodos, todoExpandIndex: -1 });
      this.loadDishes();
      
      wx.hideLoading();
      wx.showToast({
        title: '完成！获得一颗小星星 ⭐',
        icon: 'success',
        duration: 2000
      });
    } catch (err) {
      wx.hideLoading();
      console.error('完成待做失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 删除待做菜品
  async removeTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todoOrders = app.globalData.todoOrders || [];
    const newTodos = todoOrders.filter(t => t.id !== id);
    app.globalData.todoOrders = newTodos;
    this.setData({ todoOrders: newTodos, todoExpandIndex: -1 });
    
    // 从云端删除
    try {
      const todoRes = await db.get('todo_orders', { id: id });
      if (todoRes.success && todoRes.data.length > 0) {
        await db.remove('todo_orders', todoRes.data[0]._id);
      }
    } catch (err) {
      console.error('删除待做失败:', err);
    }
  },

  // 更新当前分类的菜品列表
  updateCurrentDishes() {
    const category = this.data.tabs[this.data.activeTab].value;
    let filtered = this.data.allDishes;
    if (category !== 'all') {
      filtered = this.data.allDishes.filter(dish => dish.category === category);
    }
    this.setData({ currentDishes: filtered });
  },

  // 加载菜品数据
  loadDishes() {
    const dishes = app.globalData.dishes || [];
    this.setData({ allDishes: dishes });
    this.updateCurrentDishes();
  },

  // 切换Tab
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index });
    this.updateCurrentDishes();
  },

  // 打开新增弹窗
  openAddDish() {
    this.setData({
      showModal: true,
      isEditMode: false,
      formData: {
        _id: null,
        id: null,
        name: '',
        category: 'meat',
        categoryName: '肉菜',
        description: '',
        images: [],
        recipe: '',
        recipeImages: []
      }
    });
  },

  // 打开编辑弹窗
  openEditDish(e) {
    const dish = e.currentTarget.dataset.dish;
    this.setData({
      showModal: true,
      isEditMode: true,
      formData: {
        _id: dish._id || null,  // 保存云数据库ID
        id: dish.id,
        name: dish.name,
        category: dish.category,
        categoryName: dish.categoryName,
        description: dish.description || '',
        images: dish.images || [],
        recipe: dish.recipe || '',
        recipeImages: dish.recipeImages || []
      }
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showModal: false });
  },

  // 阻止冒泡
  preventMove() {},
  stopPropagation() {},

  // 表单输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  onDescInput(e) {
    this.setData({
      'formData.description': e.detail.value
    });
  },

  onRecipeInput(e) {
    this.setData({
      'formData.recipe': e.detail.value
    });
  },

  // 显示分类选择器
  showCategoryPicker() {
    const categories = this.data.tabs.filter(t => t.value !== 'all');
    wx.showActionSheet({
      itemList: categories.map(t => t.name),
      success: (res) => {
        const selected = categories[res.tapIndex];
        this.setData({
          'formData.category': selected.value,
          'formData.categoryName': selected.name
        });
      }
    });
  },

  // 选择菜品图片（支持本地图片和云存储图片）
  chooseImage() {
    const remaining = 3 - this.data.formData.images.length;
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath);
        const images = [...this.data.formData.images, ...newImages];
        this.setData({
          'formData.images': images
        });
      }
    });
  },

  // 删除菜品图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.formData.images];
    images.splice(index, 1);
    this.setData({
      'formData.images': images
    });
  },

  // 选择菜谱图片
  chooseRecipeImage() {
    const remaining = 3 - this.data.formData.recipeImages.length;
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath);
        const images = [...this.data.formData.recipeImages, ...newImages];
        this.setData({
          'formData.recipeImages': images
        });
      }
    });
  },

  // 删除菜谱图片
  deleteRecipeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.formData.recipeImages];
    images.splice(index, 1);
    this.setData({
      'formData.recipeImages': images
    });
  },

  // 提交菜品（新增或编辑）
  async submitDish() {
    const { name, category, categoryName } = this.data.formData;

    // 表单验证
    if (!name.trim()) {
      wx.showToast({
        title: '请输入菜品名称',
        icon: 'none'
      });
      return;
    }

    if (!category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...', icon: 'none' });

    try {
      // 1. 处理图片（base64跳过，cloud://和本地图片都会处理）
      let images = [];
      if (this.data.formData.images.length > 0) {
        images = await upload.uploadImages(this.data.formData.images, 'dish');
      }
      
      let recipeImages = [];
      if (this.data.formData.recipeImages.length > 0) {
        recipeImages = await upload.uploadImages(this.data.formData.recipeImages, 'recipe');
      }
      
      // 2. 准备数据
      const dishData = {
        id: this.data.formData.id || Date.now(),
        name: name,
        category: category,
        categoryName: categoryName,
        description: this.data.formData.description,
        images: images,
        recipe: this.data.formData.recipe,
        recipeImages: recipeImages,
        cookCount: this.data.isEditMode ? (this.data.formData.cookCount || 0) : 0
      };
      
      const dishes = app.globalData.dishes || [];
      
      if (this.data.isEditMode && this.data.formData._id) {
        // 3. 编辑：更新云数据库
        await db.update('dishes', this.data.formData._id, dishData);
        
        // 4. 更新本地数据
        const index = dishes.findIndex(d => d._id === this.data.formData._id);
        if (index !== -1) {
          dishes[index] = {
            ...dishes[index],
            ...dishData
          };
        }
        
        wx.showToast({
          title: '保存成功 ✨',
          icon: 'success',
          duration: 1500
        });
      } else {
        // 5. 新增：添加到云数据库
        const result = await db.add('dishes', dishData);
        
        if (result.success) {
          // 6. 添加到本地数据
          dishes.push({
            ...dishData,
            _id: result.data._id
          });
          
          wx.showToast({
            title: '添加成功 🎉',
            icon: 'success',
            duration: 1500
          });
        } else {
          throw result.error;
        }
      }
      
      app.globalData.dishes = dishes;
      this.setData({ showModal: false });
      this.loadDishes();
      
    } catch (err) {
      console.error('保存菜品失败:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除菜品
  deleteDish(e) {
    const dish = e.currentTarget.dataset.dish;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个菜品吗？',
      confirmColor: '#FF9AAF',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', icon: 'none' });
          
          try {
            // 1. 从云数据库删除
            if (dish._id) {
              await db.remove('dishes', dish._id);
            }
            
            // 2. 删除云存储图片（可选，这里先不删除，避免误删）
            // if (dish.images && dish.images.length > 0) {
            //   for (const img of dish.images) {
            //     if (img.startsWith('cloud://')) {
            //       await upload.deleteImage(img);
            //     }
            //   }
            // }
            
            // 3. 从本地数据删除
            let dishes = app.globalData.dishes || [];
            dishes = dishes.filter(d => d.id !== dish.id);
            app.globalData.dishes = dishes;
            
            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadDishes();
          } catch (err) {
            wx.hideLoading();
            console.error('删除菜品失败:', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 做这道菜 - 获得星星
  async cookDish(e) {
    const dish = e.currentTarget.dataset.dish;
    
    wx.showLoading({ title: '烹饪中...', icon: 'none' });
    
    try {
      // 更新星星数
      app.globalData.starCount = (app.globalData.starCount || 0) + 1;
      
      // 更新菜品被做次数
      const dishes = app.globalData.dishes || [];
      const index = dishes.findIndex(d => d.id === dish.id);
      if (index !== -1) {
        dishes[index].cookCount = (dishes[index].cookCount || 0) + 1;
        app.globalData.dishes = dishes;
        
        // 同步到云端
        if (dishes[index]._id) {
          await db.update('dishes', dishes[index]._id, {
            cookCount: dishes[index].cookCount
          });
        }
      }
      
      // 添加烹饪记录
      const cookHistory = app.globalData.cookHistory || [];
      cookHistory.unshift({
        dishName: dish.name,
        dishId: dish.id,
        time: new Date().toLocaleString('zh-CN'),
        stars: 1
      });
      // 只保留最近100条
      if (cookHistory.length > 100) {
        cookHistory = cookHistory.slice(0, 100);
      }
      app.globalData.cookHistory = cookHistory;
      
      // 更新或创建统计数据
      const statsRes = await db.get('user_stats');
      if (statsRes.success && statsRes.data.length > 0) {
        await db.update('user_stats', statsRes.data[0]._id, {
          starCount: app.globalData.starCount,
          cookHistory: cookHistory
        });
      } else {
        await db.add('user_stats', {
          starCount: app.globalData.starCount,
          cookHistory: cookHistory
        });
      }
      
      wx.hideLoading();
      
      // 显示获得星星提示
      wx.showToast({
        title: '恭喜获得一颗小星星 ⭐',
        icon: 'success',
        duration: 2000
      });
      
      this.loadDishes();
    } catch (err) {
      wx.hideLoading();
      console.error('烹饪失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  }
});
