const app = getApp();

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
    this.loadDishes();
    this.loadTodoOrders();
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
  completeTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todoOrders = app.globalData.todoOrders || [];
    const item = todoOrders.find(t => t.id === id);
    if (!item) return;

    wx.showLoading({ title: '烹饪中...', icon: 'none' });
    setTimeout(() => {
      wx.hideLoading();

      // 获得星星
      app.globalData.starCount = (app.globalData.starCount || 0) + 1;

      // 更新菜品被做次数
      const dishes = app.globalData.dishes || [];
      const dishIdx = dishes.findIndex(d => d.id === item.dish.id);
      if (dishIdx !== -1) {
        dishes[dishIdx].cookCount = (dishes[dishIdx].cookCount || 0) + 1;
        app.globalData.dishes = dishes;
      }

      // 添加烹饪记录
      const cookHistory = app.globalData.cookHistory || [];
      cookHistory.unshift({
        dishName: item.dishName,
        dishId: item.dish.id,
        time: new Date().toLocaleString('zh-CN'),
        stars: 1
      });
      app.globalData.cookHistory = cookHistory;

      // 从待做列表移除
      const newTodos = todoOrders.filter(t => t.id !== id);
      app.globalData.todoOrders = newTodos;
      this.setData({ todoOrders: newTodos, todoExpandIndex: -1 });
      this.loadDishes();

      wx.showToast({
        title: '完成！获得一颗小星星 ⭐',
        icon: 'success',
        duration: 2000
      });
    }, 800);
  },

  // 删除待做菜品
  removeTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todoOrders = app.globalData.todoOrders || [];
    const newTodos = todoOrders.filter(t => t.id !== id);
    app.globalData.todoOrders = newTodos;
    this.setData({ todoOrders: newTodos, todoExpandIndex: -1 });
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

  // 选择菜品图片
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

  // 提交菜品
  submitDish() {
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

    const dishes = app.globalData.dishes || [];
    
    if (this.data.isEditMode) {
      // 编辑
      const index = dishes.findIndex(d => d.id === this.data.formData.id);
      if (index !== -1) {
        dishes[index] = {
          ...this.data.formData,
          cookCount: dishes[index].cookCount || 0
        };
      }
    } else {
      // 新增
      const newDish = {
        ...this.data.formData,
        id: Date.now(),
        cookCount: 0
      };
      dishes.push(newDish);
    }
    
    app.globalData.dishes = dishes;
    
    wx.showToast({
      title: this.data.isEditMode ? '保存成功 ✨' : '添加成功 🎉',
      icon: 'success',
      duration: 1500
    });

    this.setData({ showModal: false });
    this.loadDishes();
  },

  // 删除菜品
  deleteDish(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个菜品吗？',
      confirmColor: '#FF9AAF',
      success: (res) => {
        if (res.confirm) {
          let dishes = app.globalData.dishes || [];
          dishes = dishes.filter(d => d.id !== id);
          app.globalData.dishes = dishes;
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          this.loadDishes();
        }
      }
    });
  },

  // 做这道菜 - 获得星星
  cookDish(e) {
    const dish = e.currentTarget.dataset.dish;
    
    // 星星动画提示
    wx.showLoading({ title: '烹饪中...', icon: 'none' });
    
    setTimeout(() => {
      wx.hideLoading();
      
      // 更新星星数
      app.globalData.starCount = (app.globalData.starCount || 0) + 1;
      
      // 更新菜品被做次数
      const dishes = app.globalData.dishes || [];
      const index = dishes.findIndex(d => d.id === dish.id);
      if (index !== -1) {
        dishes[index].cookCount = (dishes[index].cookCount || 0) + 1;
        app.globalData.dishes = dishes;
      }
      
      // 添加烹饪记录
      const cookHistory = app.globalData.cookHistory || [];
      cookHistory.unshift({
        dishName: dish.name,
        dishId: dish.id,
        time: new Date().toLocaleString('zh-CN'),
        stars: 1
      });
      app.globalData.cookHistory = cookHistory;
      
      // 显示获得星星提示
      wx.showToast({
        title: '恭喜获得一颗小星星 ⭐',
        icon: 'success',
        duration: 2000
      });
      
      this.loadDishes();
    }, 800);
  }
});
