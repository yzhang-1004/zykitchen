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
    
    // 点菜篮
    showCartModal: false,
    cartCount: 0,
    recipeExpandIndex: -1  // 当前展开菜谱的索引，-1表示无展开
  },

  onShow() {
    this.loadDishes();
    this.updateCartCount();
  },

  // 加载菜品数据
  loadDishes() {
    const dishes = app.globalData.dishes || [];
    this.setData({ allDishes: dishes });
    this.updateCurrentDishes();
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

  // 切换Tab
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index });
    this.updateCurrentDishes();
  },

  // 添加到点菜篮
  addToCart(e) {
    const dish = e.currentTarget.dataset.dish;
    const cartItems = app.globalData.cartItems || [];
    
    // 检查是否已存在
    const existIndex = cartItems.findIndex(item => item.dish.id === dish.id);
    if (existIndex !== -1) {
      cartItems[existIndex].quantity += 1;
    } else {
      cartItems.push({ dish: dish, quantity: 1 });
    }
    
    app.globalData.cartItems = cartItems;
    this.updateCartCount();
    
    wx.showToast({
      title: '已加入点菜篮 🧺',
      icon: 'none',
      duration: 1000
    });
  },

  // 更新购物车数量
  updateCartCount() {
    const cartItems = app.globalData.cartItems || [];
    const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({ cartCount: count });
  },

  // 预处理购物车数据（拆分菜谱步骤）
  _processCartItems(cartItems) {
    return cartItems.map(item => {
      const recipe = item.dish.recipe || '';
      return Object.assign({}, item, {
        recipeSteps: recipe ? recipe.split('\n').filter(s => s.trim()) : []
      });
    });
  },

  // 显示点菜篮弹窗
  showCartModal() {
    const cartItems = app.globalData.cartItems || [];
    this.setData({ 
      showCartModal: true,
      cartItems: this._processCartItems(cartItems),
      recipeExpandIndex: -1
    });
  },

  // 关闭点菜篮弹窗
  closeCartModal() {
    this.setData({ showCartModal: false, recipeExpandIndex: -1 });
  },

  // 展开/折叠菜谱详情
  toggleRecipe(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      recipeExpandIndex: this.data.recipeExpandIndex === index ? -1 : index
    });
  },

  // 阻止冒泡
  preventMove() {},
  stopPropagation() {},

  // 增加数量
  increaseQuantity(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = app.globalData.cartItems;
    cartItems[index].quantity += 1;
    app.globalData.cartItems = cartItems;
    const processed = this._processCartItems(cartItems);
    this.setData({ cartItems: processed });
    this.updateCartCount();
  },

  // 减少数量
  decreaseQuantity(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = app.globalData.cartItems;
    if (cartItems[index].quantity > 1) {
      cartItems[index].quantity -= 1;
      app.globalData.cartItems = cartItems;
      this.setData({ cartItems: this._processCartItems(cartItems) });
      this.updateCartCount();
    } else {
      // 移除该项
      cartItems.splice(index, 1);
      app.globalData.cartItems = cartItems;
      this.setData({ cartItems: this._processCartItems(cartItems) });
      this.updateCartCount();
    }
  },

  // 确认下单
  confirmOrder() {
    const cartItems = app.globalData.cartItems || [];
    if (cartItems.length === 0) {
      wx.showToast({
        title: '点菜篮是空的哦~',
        icon: 'none'
      });
      return;
    }

    // 将已点菜品写入待做列表
    const todoOrders = app.globalData.todoOrders || [];
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN');
    cartItems.forEach(item => {
      const recipe = item.dish.recipe || '';
      todoOrders.push({
        id: Date.now() + Math.random(),
        dishName: item.dish.name,
        dish: item.dish,
        quantity: item.quantity,
        time: timeStr,
        recipeSteps: recipe ? recipe.split('\n').filter(s => s.trim()) : []
      });
    });
    app.globalData.todoOrders = todoOrders;

    // 清空点菜篮
    app.globalData.cartItems = [];
    this.updateCartCount();
    this.setData({ showCartModal: false, recipeExpandIndex: -1 });

    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    wx.showModal({
      title: '下单成功 🎉',
      content: `共点了 ${totalQty} 道菜，已加入待做清单！`,
      showCancel: false,
      confirmText: '好的',
      confirmColor: '#FF9AAF',
      success: () => {
        wx.showToast({
          title: '去管理页查看待做吧 😋',
          icon: 'none',
          duration: 2000
        });
      }
    });
  }
});
