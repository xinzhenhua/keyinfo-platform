// 初始化 LeanCloud
AV.init({
    appId: "9jaNrP32GNBDPyR1kX9pjtLc-gzGzoHsz",
    appKey: "2e38KBVaknfgu16HcdpGmwk0",
    serverURL: "https://9janrp32.lc-cn-n1-shared.com"
});

// 检查用户是否已登录，如果没有则重定向到登录页面
function checkLogin() {
    const currentUser = AV.User.current();
    if (!currentUser) {
        window.location.href = 'index.html';
        return false;
    }
    return currentUser;
}

// 格式化时间
function formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 格式化金额
function formatCurrency(amount) {
    return '¥' + parseFloat(amount).toFixed(2);
}

// 获取意向等级文本
function getIntentionLevel(level) {
    const levels = {
        '1': '低 - 可能考虑装修',
        '2': '中 - 计划近期装修',
        '3': '高 - 急需装修方案'
    };
    return levels[level] || '未知';
}

// 显示加载动画
function showLoading(element) {
    element.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></div>';
}

// 创建通知
async function createNotification(user, title, message, linkUrl = null) {
    try {
        const Notification = AV.Object.extend('Notification');
        const notification = new Notification();
        
        notification.set('title', title);
        notification.set('message', message);
        notification.set('user', user);
        notification.set('isRead', false);
        if (linkUrl) {
            notification.set('linkUrl', linkUrl);
        }
        
        return await notification.save();
    } catch (error) {
        console.error('创建通知失败:', error);
        // 不阻止主流程，故返回null
        return null;
    }
}

// 状态标签生成
function getStatusBadge(status) {
    switch(status) {
        case 'verified':
            return '<span class="badge badge-verified"><i class="bi bi-check-circle me-1"></i>已审核</span>';
        case 'pending':
            return '<span class="badge badge-pending"><i class="bi bi-clock me-1"></i>待审核</span>';
        case 'completed':
            return '<span class="badge badge-verified"><i class="bi bi-check-circle me-1"></i>已完成</span>';
        default:
            return '<span class="badge bg-secondary">未知状态</span>';
    }
}

// 检查银行卡信息是否已填写
async function checkBankInfo(userId) {
    try {
        const query = new AV.Query('BankInfo');
        query.equalTo('user', AV.Object.createWithoutData('_User', userId));
        const result = await query.first();
        return result ? true : false;
    } catch (error) {
        // 可能是 BankInfo 类不存在
        console.log('检查银行卡信息失败，可能是类不存在', error);
        return false;
    }
}

// 获取用户的银行卡信息
async function getUserBankInfo(userId) {
    try {
        const query = new AV.Query('BankInfo');
        query.equalTo('user', AV.Object.createWithoutData('_User', userId));
        return await query.first();
    } catch (error) {
        // 可能是 BankInfo 类不存在
        console.log('获取银行卡信息失败，可能是类不存在', error);
        return null;
    }
}

// 安全显示模态框的助手函数
function safeShowModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
        console.error(`模态框元素不存在: ${modalId}`);
        return false;
    }
    
    // 使用原生方式显示模态框
    modalElement.style.display = 'block';
    modalElement.classList.add('show');
    document.body.classList.add('modal-open');
    
    // 创建背景遮罩
    let backdrop = document.querySelector('.modal-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
    }
    
    // 添加关闭按钮事件
    const closeButtons = modalElement.querySelectorAll('[data-bs-dismiss="modal"]');
    closeButtons.forEach(button => {
        // 移除现有事件监听器以避免重复
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function() {
            closeModal(modalId);
        });
    });
    
    // 添加点击模态框外部关闭的功能
    modalElement.addEventListener('click', function(event) {
        if (event.target === modalElement) {
            closeModal(modalId);
        }
    });
    
    return true;
}

// 关闭模态框函数
function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        modalElement.style.display = 'none';
        modalElement.classList.remove('show');
    }
    
    // 移除背景遮罩
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        document.body.removeChild(backdrop);
    }
    
    document.body.classList.remove('modal-open');
} 