App({
  onLaunch() {
    console.log('ZY厨房小程序启动啦~ 🎉');
    // 初始化全局数据（菜品和待做初始为空，用户自行添加）
    if (!this.globalData.dishes) {
      this.globalData.dishes = [];
    }
    if (!this.globalData.cartItems) {
      this.globalData.cartItems = [];
    }
    if (!this.globalData.todoOrders) {
      this.globalData.todoOrders = [];
    }
    if (!this.globalData.starCount) {
      this.globalData.starCount = 0;
    }
    if (!this.globalData.cookHistory) {
      this.globalData.cookHistory = [];
    }
  },
  globalData: {
    dishes: [],           // 菜品列表
    cartItems: [],        // 点菜篮 [{dish, quantity}]
    todoOrders: [],       // 待做菜品 [{id, dishName, dish, quantity, time, recipeSteps}]
    starCount: 0,         // 星星总数
    cookHistory: []       // 烹饪记录 [{dishName, time, stars}]
  }
})