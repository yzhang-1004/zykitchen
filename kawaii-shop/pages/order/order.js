const app = getApp();
const db = require('../../utils/db');

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
    recipeExpandIndex: -1,  // 当前展开菜谱的索引，-1表示无展开
    
    // 节流标志
    _syncing: false
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
    
    // 节流同步到云端（500ms）
    this._syncCartToCloud();
  },

  // 节流同步购物车到云端
  _syncCartToCloud() {
    if (this.data._syncing) return;
    
    this.setData({ _syncing: true });
    
    setTimeout(async () => {
      try {
        const cartItems = app.globalData.cartItems || [];
        
        // 查询是否已存在购物车文档
        const existing = await db.get('cart_items');
        
        if (existing.success && existing.data.length > 0) {
          // 更新现有购物车
          await db.update('cart_items', existing.data[0]._id, {
            items: cartItems
          });
        } else {
          // 创建新购物车
          await db.add('cart_items', {
            items: cartItems
          });
        }
        
        console.log('购物车已同步到云端 ✅');
      } catch (err) {
        console.error('同步购物车失败:', err);
      } finally {
        this.setData({ _syncing: false });
      }
    }, 500);
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
    
    // 同步到云端
    this._syncCartToCloud();
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
    
    // 同步到云端
    this._syncCartToCloud();
  },

  // 确认下单
  async confirmOrder() {
    const cartItems = app.globalData.cartItems || [];
    if (cartItems.length === 0) {
      wx.showToast({
        title: '点菜篮是空的哦~',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '下单中...', icon: 'none' });

    try {
      // 将已点菜品写入待做列表
      const todoOrders = app.globalData.todoOrders || [];
      const now = new Date();
      const timeStr = now.toLocaleString('zh-CN');
      
      // 准备要添加到云端的订单
      const ordersToAdd = [];
      
      cartItems.forEach(item => {
        const recipe = item.dish.recipe || '';
        const order = {
          id: Date.now() + Math.random(),
          dishName: item.dish.name,
          dish: item.dish,
          quantity: item.quantity,
          time: timeStr,
          status: 'pending',
          recipeSteps: recipe ? recipe.split('\n').filter(s => s.trim()) : []
        };
        todoOrders.push(order);
        ordersToAdd.push(order);
      });
      
      app.globalData.todoOrders = todoOrders;
      
      // 添加到云数据库
      for (const order of ordersToAdd) {
        await db.add('todo_orders', order);
      }
      
      // 清空点菜篮
      app.globalData.cartItems = [];
      
      // 清空云端购物车
      const existing = await db.get('cart_items');
      if (existing.success && existing.data.length > 0) {
        await db.update('cart_items', existing.data[0]._id, {
          items: []
        });
      }
      
      this.updateCartCount();
      this.setData({ showCartModal: false, recipeExpandIndex: -1 });
      
      wx.hideLoading();

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
    } catch (err) {
      wx.hideLoading();
      console.error('下单失败:', err);
      wx.showToast({
        title: '下单失败，请重试',
        icon: 'none'
      });
    }
  }
});
