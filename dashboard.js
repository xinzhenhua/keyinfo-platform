document.addEventListener('DOMContentLoaded', function() {
    // 检查用户登录状态
    const currentUser = checkLogin();
    if (!currentUser) return;
    
    // 检查用户角色
    if (currentUser.get('role') === 'admin') {
        window.location.href = 'admin.html';
        return;
    }
    
    // 显示用户名
    document.getElementById('user-name').textContent = '用户：' + currentUser.getUsername();
    
    // 加载初始数据
    loadDashboardData();
    
    // 添加标签切换事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 检查是否有data-tab属性
            const tabId = this.getAttribute('data-tab');
            if (!tabId) {
                console.error('导航链接没有设置data-tab属性');
                return; // 如果没有data-tab属性，则不执行后续操作
            }
            
            // 检查对应的标签内容是否存在
            const tabContent = document.getElementById(tabId + '-tab');
            if (!tabContent) {
                console.error('找不到ID为 ' + tabId + '-tab 的标签内容');
                return; // 如果对应的标签内容不存在，则不执行后续操作
            }
            
            // 激活选中的导航项
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            
            // 显示对应的内容区域
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            tabContent.style.display = 'block';
            
            // 加载对应的数据
            switch(tabId) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'clients':
                    loadClientsList();
                    break;
                case 'bank-info':
                    loadBankInfo();
                    break;
                case 'withdraw':
                    loadWithdrawData();
                    break;
                case 'profile':
                    loadProfileInfo();
                    break;
            }
        });
    });
    
    // 退出登录
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('确定要退出登录吗？')) {
            AV.User.logOut().then(() => {
                window.location.href = 'index.html';
            });
        }
    });
    
    // 客户表单提交
    document.getElementById('client-form').addEventListener('submit', function(e) {
        e.preventDefault();
        submitClientForm();
    });
    
    // 银行卡表单提交
    document.getElementById('bank-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveBankInfo();
    });
    
    // 提现表单提交
    document.getElementById('withdraw-form').addEventListener('submit', function(e) {
        e.preventDefault();
        requestWithdraw();
    });
    
    // 客户筛选事件
    document.getElementById('client-filter').addEventListener('change', function() {
        loadClientsList(this.value);
    });
    
    // 定期检查新通知
    setInterval(refreshNotifications, 60000); // 每1分钟刷新一次通知
    
    // 添加个人信息表单提交事件
    document.getElementById('profile-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updatePassword();
    });
    
    // 确保在移动设备上点击菜单项后收起导航栏
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth < 992) { // Bootstrap lg断点
                    const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                    bsCollapse.hide();
                }
            });
        });
    }
    
    // 浮动添加客户按钮点击事件
    const addClientFloatBtn = document.getElementById('add-client-float-btn');
    if (addClientFloatBtn) {
        // 页面加载完成后添加脉冲动画
        setTimeout(() => {
            addClientFloatBtn.classList.add('pulse-animation');
            
            // 动画结束后移除类
            addClientFloatBtn.addEventListener('animationend', () => {
                addClientFloatBtn.classList.remove('pulse-animation');
            });
        }, 1000);
        
        // 点击事件
        addClientFloatBtn.addEventListener('click', function() {
            // 打开添加客户模态框
            const addClientModal = document.getElementById('add-client-modal');
            if (addClientModal) {
                safeShowModal('add-client-modal');
            } else {
                console.error('找不到添加客户模态框');
                alert('系统错误：找不到添加客户模态框');
            }
        });
    }
    
    // 添加客户表单提交事件
    const addClientForm = document.getElementById('add-client-form');
    if (addClientForm) {
        addClientForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 提交中...';
            
            try {
                // 获取表单数据
                const name = this.querySelector('#client-name').value;
                const phone = this.querySelector('#client-phone').value;
                const community = this.querySelector('#client-community').value;
                const houseNumber = this.querySelector('#client-house-number').value;
                const area = this.querySelector('#client-area').value;
                const intention = this.querySelector('#client-intention').value;
                const remarks = this.querySelector('#client-remarks').value;
                
                // 创建客户数据
                const Client = AV.Object.extend('Client');
                const client = new Client();
                
                client.set('name', name);
                client.set('phone', phone);
                client.set('community', community);
                client.set('houseNumber', houseNumber);
                client.set('area', parseFloat(area));
                client.set('intention', intention);
                client.set('remarks', remarks);
                client.set('status', 'pending');
                client.set('agent', AV.User.current());
                
                await client.save();
                
                // 重置表单
                this.reset();
                
                // 关闭模态框
                closeModal('add-client-modal');
                
                // 提示成功
                alert('客户信息提交成功，等待管理员审核');
                
                // 刷新客户列表
                loadClientList();
                
            } catch (error) {
                console.error('添加客户失败:', error);
                alert('添加客户失败: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // 添加客户表单提交按钮事件
    const submitClientBtn = document.getElementById('submit-client-btn');
    if (submitClientBtn) {
        submitClientBtn.addEventListener('click', function() {
            const form = document.getElementById('add-client-form');
            if (form.checkValidity()) {
                // 使用FormData来获取表单数据
                const formData = new FormData(form);
                submitClientData(form);
            } else {
                // 触发浏览器的表单验证
                form.reportValidity();
            }
        });
    }

    // 设置欢迎面板10秒后自动隐藏
    const welcomeBanner = document.getElementById('welcome-banner');
    if (welcomeBanner) {
        // 添加动画结束后淡出的类
        setTimeout(() => {
            welcomeBanner.classList.add('animate__animated', 'animate__fadeOut');
            welcomeBanner.addEventListener('animationend', () => {
                welcomeBanner.style.display = 'none';
            });
        }, 10000); // 10秒后隐藏
    }

    // 内联添加客户按钮点击事件
    const inlineAddClientBtn = document.getElementById('inline-add-client-btn');
    if (inlineAddClientBtn) {
        inlineAddClientBtn.addEventListener('click', function() {
            // 打开添加客户模态框
            const addClientModal = document.getElementById('add-client-modal');
            if (addClientModal) {
                safeShowModal('add-client-modal');
            } else {
                console.error('找不到添加客户模态框');
                alert('系统错误：找不到添加客户模态框');
            }
        });
    }
});

// 刷新通知
function refreshNotifications() {
    // 检查当前激活的标签
    const activeNavLink = document.querySelector('.nav-link.active');
    if (!activeNavLink) return; // 如果没有激活的标签，则不执行
    
    // 只有当当前页面是仪表盘时才刷新通知
    if (activeNavLink.getAttribute('data-tab') === 'dashboard') {
        loadNotifications();
    }
}

// 加载仪表盘数据
async function loadDashboardData() {
    const currentUser = AV.User.current();
    const userId = currentUser.id;
    
    try {
        // 统计数据查询
        const clientQuery = new AV.Query('Client');
        clientQuery.equalTo('agent', AV.Object.createWithoutData('_User', userId));
        
        const verifiedQuery = new AV.Query('Client');
        verifiedQuery.equalTo('agent', AV.Object.createWithoutData('_User', userId));
        verifiedQuery.equalTo('status', 'verified');
        
        const pendingQuery = new AV.Query('Client');
        pendingQuery.equalTo('agent', AV.Object.createWithoutData('_User', userId));
        pendingQuery.equalTo('status', 'pending');
        
        // 并行执行查询
        const [totalReward, verifiedCount, pendingCount] = await Promise.all([
            calculateTotalReward(userId),
            verifiedQuery.count(),
            pendingQuery.count()
        ]);
        
        // 更新UI
        document.getElementById('total-reward').textContent = formatCurrency(totalReward);
        document.getElementById('verified-count').textContent = verifiedCount;
        document.getElementById('pending-count').textContent = pendingCount;
        
        // 加载通知
        loadNotifications();
        
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        alert('加载数据失败，请刷新页面重试');
    }
}

// 计算总奖励金额
async function calculateTotalReward(userId) {
    const query = new AV.Query('Client');
    query.equalTo('agent', AV.Object.createWithoutData('_User', userId));
    query.equalTo('status', 'verified');
    const count = await query.count();
    return count * 50; // 每个通过审核的客户奖励50元
}

// 加载通知
async function loadNotifications() {
    const currentUser = AV.User.current();
    const notificationsContainer = document.getElementById('notifications-list');
    showLoading(notificationsContainer);
    
    try {
        // 首先检查Notification类是否存在，如果不存在则显示暂无通知
        try {
            // 创建一个临时查询来检查类是否存在
            const tempQuery = new AV.Query('Notification');
            tempQuery.limit(1);
            await tempQuery.find();
            
            // 如果执行到这里，说明类存在，继续加载通知
            const query = new AV.Query('Notification');
            query.equalTo('user', AV.Object.createWithoutData('_User', currentUser.id));
            query.descending('createdAt');
            query.limit(5);
            
            const notifications = await query.find();
            
            if (notifications.length === 0) {
                notificationsContainer.innerHTML = '<div class="text-center p-4 text-muted">暂无通知</div>';
                return;
            }
            
            let html = '';
            for (const notification of notifications) {
                const title = notification.get('title');
                const message = notification.get('message');
                const date = formatDate(notification.createdAt);
                const isRead = notification.get('isRead');
                const linkUrl = notification.get('linkUrl');
                
                html += `
                    <div class="notification-item p-3 mb-2 border-bottom ${!isRead ? 'bg-light' : ''}">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0 ${!isRead ? 'fw-bold' : ''}">${title}</h6>
                            <small class="text-muted">${date}</small>
                        </div>
                        <p class="mb-0">${message}</p>
                        ${linkUrl ? `<a href="${linkUrl}" class="btn btn-sm btn-link px-0 mt-2">查看详情</a>` : ''}
                    </div>
                `;
                
                // 标记为已读
                if (!notification.get('isRead')) {
                    notification.set('isRead', true);
                    notification.save();
                }
            }
            
            notificationsContainer.innerHTML = html;
        } catch (queryError) {
            // 如果是类不存在错误，则显示无通知
            console.log('通知类可能不存在:', queryError);
            notificationsContainer.innerHTML = '<div class="text-center p-4 text-muted">暂无通知</div>';
            
            // 自动创建Notification类以避免将来的错误
            try {
                console.log('尝试创建Notification类...');
                // 创建一个临时通知对象并保存，这会自动创建类
                const Notification = AV.Object.extend('Notification');
                const tempNotification = new Notification();
                tempNotification.set('title', '系统初始化');
                tempNotification.set('message', '系统通知功能已初始化');
                tempNotification.set('user', currentUser);
                tempNotification.set('isRead', true);
                // 保存后立即销毁，不会真正显示给用户
                await tempNotification.save();
                await tempNotification.destroy();
                console.log('Notification类创建成功');
            } catch (initError) {
                console.error('尝试初始化Notification类失败:', initError);
            }
        }
    } catch (error) {
        console.error('加载通知失败:', error);
        notificationsContainer.innerHTML = '<div class="text-center p-4 text-danger">加载通知失败，请刷新页面重试</div>';
    }
}

// 提交客户表单
async function submitClientForm() {
    const currentUser = AV.User.current();
    const submitBtn = document.querySelector('#client-form button[type="submit"]');
    
    // 禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 提交中...';
    
    try {
        // 获取表单数据
        const clientName = document.getElementById('client-name').value;
        const clientPhone = document.getElementById('client-phone').value;
        const community = document.getElementById('client-community').value;
        const houseNumber = document.getElementById('client-house').value;
        const area = document.getElementById('client-area').value;
        const intention = document.getElementById('client-intention').value;
        const remarks = document.getElementById('client-remarks').value;
        
        // 创建新客户记录
        const Client = AV.Object.extend('Client');
        const client = new Client();
        
        client.set('name', clientName);
        client.set('phone', clientPhone);
        client.set('community', community);
        client.set('houseNumber', houseNumber);
        client.set('area', parseFloat(area));
        client.set('intention', intention);
        client.set('remarks', remarks);
        client.set('agent', currentUser);
        client.set('status', 'pending');
        // 添加标记字段，用于管理员通知系统
        client.set('notificationSent', false);
        
        await client.save();
        
        // 重置表单
        document.getElementById('client-form').reset();
        
        // 显示成功消息
        alert('客户信息提交成功，等待管理员审核');
        
        // 刷新仪表盘数据
        loadDashboardData();
        
    } catch (error) {
        console.error('提交客户信息失败:', error);
        alert('提交客户信息失败: ' + error.message);
    } finally {
        // 恢复提交按钮
        submitBtn.disabled = false;
        submitBtn.textContent = '提交信息';
    }
}

// 加载客户列表
async function loadClientsList(filter = 'all') {
    const currentUser = AV.User.current();
    const clientsContainer = document.getElementById('clients-list');
    
    showLoading(clientsContainer);
    
    try {
        const query = new AV.Query('Client');
        query.equalTo('agent', AV.Object.createWithoutData('_User', currentUser.id));
        query.descending('createdAt');
        
        if (filter !== 'all') {
            query.equalTo('status', filter);
        }
        
        const clients = await query.find();
        
        if (clients.length === 0) {
            clientsContainer.innerHTML = '<div class="text-center p-4">暂无客户信息</div>';
            return;
        }
        
        // 判断是否为移动设备
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // 移动端卡片式布局
            let html = '';
            for (const client of clients) {
                const name = client.get('name');
                const phone = client.get('phone');
                const community = client.get('community');
                const houseNumber = client.get('houseNumber');
                const area = client.get('area');
                const intention = client.get('intention');
                const status = client.get('status');
                const createdAt = formatDate(client.createdAt);
                
                const intentionText = getIntentionLevel(intention);
                
                html += `
                    <div class="card mb-3 client-card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="card-title mb-0">${name}</h5>
                                ${getStatusBadge(status)}
                            </div>
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">联系电话</small>
                                    <p class="mb-0">${phone}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">意向度</small>
                                    <p class="mb-0">${intentionText}</p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-12">
                                    <small class="text-muted">地址</small>
                                    <p class="mb-0">${community} ${houseNumber}</p>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">面积</small>
                                    <p class="mb-0">${area} m²</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">提交时间</small>
                                    <p class="mb-0">${createdAt}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            clientsContainer.innerHTML = html;
        } else {
            // 桌面端表格布局
            let html = '<table class="table table-hover"><thead><tr>' +
                '<th>客户姓名</th><th>联系电话</th><th>小区名称</th><th>房号</th>' +
                '<th>面积</th><th>意向程度</th><th>状态</th><th>提交时间</th></tr></thead><tbody>';
            
            for (const client of clients) {
                const name = client.get('name');
                const phone = client.get('phone');
                const community = client.get('community');
                const houseNumber = client.get('houseNumber');
                const area = client.get('area');
                const intention = client.get('intention');
                const status = client.get('status');
                const createdAt = formatDate(client.createdAt);
                
                const intentionText = getIntentionLevel(intention);
                
                html += `
                    <tr>
                        <td>${name}</td>
                        <td>${phone}</td>
                        <td>${community}</td>
                        <td>${houseNumber}</td>
                        <td>${area} m²</td>
                        <td>${intentionText}</td>
                        <td>${getStatusBadge(status)}</td>
                        <td>${createdAt}</td>
                    </tr>
                `;
            }
            
            html += '</tbody></table>';
            clientsContainer.innerHTML = html;
        }
        
        // 为窗口大小变化添加监听器
        if (!window.clientsListResizeListener) {
            window.clientsListResizeListener = true;
            window.addEventListener('resize', function() {
                // 当窗口大小改变时，如果当前页面是客户列表，则重新加载
                const activeTab = document.querySelector('.nav-link.active');
                if (activeTab && activeTab.getAttribute('data-tab') === 'clients') {
                    loadClientsList(document.getElementById('client-filter').value);
                }
            });
        }
        
    } catch (error) {
        console.error('加载客户列表失败:', error);
        clientsContainer.innerHTML = '<div class="text-center p-4 text-danger">加载客户信息失败，请刷新页面重试</div>';
    }
}

// 加载银行卡信息
async function loadBankInfo() {
    const currentUser = AV.User.current();
    const bankForm = document.getElementById('bank-form');
    
    try {
        // 尝试获取已保存的银行卡信息
        const query = new AV.Query('BankInfo');
        query.equalTo('user', AV.Object.createWithoutData('_User', currentUser.id));
        
        try {
            const bankInfo = await query.first();
            
            if (bankInfo) {
                // 如果有已保存信息，填充表单
                document.getElementById('bank-name').value = bankInfo.get('bankName') || '';
                document.getElementById('bank-account').value = bankInfo.get('accountNumber') || '';
                document.getElementById('account-name').value = bankInfo.get('accountName') || '';
            }
        } catch (queryError) {
            // 忽略查询错误，可能是因为 BankInfo 类不存在
            console.log('银行卡信息尚未创建', queryError);
        }
        
    } catch (error) {
        console.error('加载银行卡信息失败:', error);
        alert('加载银行卡信息失败，请刷新页面重试');
    }
}

// 保存银行卡信息
async function saveBankInfo() {
    const currentUser = AV.User.current();
    const submitBtn = document.querySelector('#bank-form button[type="submit"]');
    
    // 禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 保存中...';
    
    try {
        // 获取表单数据
        const bankName = document.getElementById('bank-name').value;
        const accountNumber = document.getElementById('bank-account').value;
        const accountName = document.getElementById('account-name').value;
        
        if (!bankName || !accountNumber || !accountName) {
            alert('请填写完整的银行卡信息');
            return;
        }
        
        // 创建或更新银行卡信息
        const BankInfo = AV.Object.extend('BankInfo');
        
        // 尝试查询现有信息
        let bankInfo;
        try {
            const query = new AV.Query('BankInfo');
            query.equalTo('user', AV.Object.createWithoutData('_User', currentUser.id));
            bankInfo = await query.first();
        } catch (error) {
            // 忽略查询错误，直接创建新记录
            console.log('创建新的银行卡信息记录');
            bankInfo = null;
        }
        
        // 如果不存在则创建新的
        if (!bankInfo) {
            bankInfo = new BankInfo();
            bankInfo.set('user', currentUser);
        }
        
        bankInfo.set('bankName', bankName);
        bankInfo.set('accountNumber', accountNumber);
        bankInfo.set('accountName', accountName);
        
        await bankInfo.save();
        
        alert('银行卡信息保存成功');
        
    } catch (error) {
        console.error('保存银行卡信息失败:', error);
        alert('保存失败: ' + error.message);
    } finally {
        // 恢复提交按钮
        submitBtn.disabled = false;
        submitBtn.textContent = '保存信息';
    }
}

// 加载提现页面数据
async function loadWithdrawData() {
    const currentUser = AV.User.current();
    
    try {
        // 分开加载以避免一个失败影响全部
        const totalReward = await calculateTotalReward(currentUser.id);
        const bankInfo = await getUserBankInfo(currentUser.id);
        
        // 直接初始化历史区域，不通过查询
        document.getElementById('withdraw-history').innerHTML = '<tr><td colspan="3" class="text-center">暂无提现记录</td></tr>';
        
        // 确保Withdrawal类存在
        try {
            // 创建Withdrawal类而不是查询
            console.log('尝试创建Withdrawal类...');
            const Withdrawal = AV.Object.extend('Withdrawal');
            const tempWithdrawal = new Withdrawal();
            tempWithdrawal.set('amount', 0);
            tempWithdrawal.set('status', 'completed');
            tempWithdrawal.set('user', currentUser);
            // 保存后立即销毁
            await tempWithdrawal.save();
            await tempWithdrawal.destroy();
            console.log('Withdrawal类创建成功，现在尝试加载记录');
            
            // 现在可以安全地加载历史
            await loadWithdrawHistory();
        } catch (error) {
            console.error('提现类初始化失败，跳过历史加载:', error);
        }
        
        // 更新可提现金额
        document.getElementById('available-amount').textContent = formatCurrency(totalReward);
        document.getElementById('withdraw-amount').min = 1000;
        document.getElementById('withdraw-amount').max = totalReward;
        document.getElementById('withdraw-btn').disabled = totalReward < 1000;
        
        // 显示银行卡信息
        const bankInfoDisplay = document.getElementById('bank-info-display');
        if (bankInfo) {
            bankInfoDisplay.innerHTML = `
                <p class="mb-1"><strong>开户银行:</strong> ${bankInfo.get('bankName')}</p>
                <p class="mb-1"><strong>账号:</strong> ${bankInfo.get('accountNumber')}</p>
                <p class="mb-0"><strong>开户人:</strong> ${bankInfo.get('accountName')}</p>
            `;
        } else {
            bankInfoDisplay.innerHTML = `
                <div class="alert alert-warning mb-0">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    您还没有设置银行卡信息，请先前往<a href="#" data-tab="bank-info" class="alert-link">银行卡信息</a>页面设置
                </div>
            `;
            document.getElementById('withdraw-btn').disabled = true;
            
            // 添加银行卡信息页面跳转
            bankInfoDisplay.querySelector('a[data-tab="bank-info"]').addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelector('.nav-link[data-tab="bank-info"]').click();
            });
        }
        
    } catch (error) {
        console.error('加载提现数据失败:', error);
        alert('加载提现数据失败，请刷新页面重试');
    }
}

// 加载提现历史
async function loadWithdrawHistory() {
    const currentUser = AV.User.current();
    const historyContainer = document.getElementById('withdraw-history');
    
    try {
        // 直接进行查询，不再检查类是否存在（因为已经在loadWithdrawData中确保创建）
        const query = new AV.Query('Withdrawal');
        query.equalTo('user', AV.Object.createWithoutData('_User', currentUser.id));
        query.descending('createdAt');
        
        const withdrawals = await query.find();
        
        if (withdrawals.length === 0) {
            historyContainer.innerHTML = '<tr><td colspan="3" class="text-center">暂无提现记录</td></tr>';
            return;
        }
        
        let html = '';
        for (const withdrawal of withdrawals) {
            const amount = withdrawal.get('amount');
            const status = withdrawal.get('status');
            const createdAt = formatDate(withdrawal.createdAt);
            
            html += `
                <tr>
                    <td>${createdAt}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${getStatusBadge(status)}</td>
                </tr>
            `;
        }
        
        historyContainer.innerHTML = html;
    } catch (error) {
        console.error('加载提现历史失败:', error);
        historyContainer.innerHTML = '<tr><td colspan="3" class="text-center text-danger">加载提现历史失败</td></tr>';
    }
}

// 申请提现
async function requestWithdraw() {
    const currentUser = AV.User.current();
    const submitBtn = document.getElementById('withdraw-btn');
    
    // 禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 提交中...';
    
    try {
        const withdrawAmount = parseFloat(document.getElementById('withdraw-amount').value);
        const totalReward = await calculateTotalReward(currentUser.id);
        
        // 检查金额
        if (withdrawAmount < 1000) {
            alert('提现金额不能低于1000元');
            return;
        }
        
        if (withdrawAmount > totalReward) {
            alert('提现金额不能超过可提现金额');
            return;
        }
        
        // 检查银行卡信息
        const bankInfo = await getUserBankInfo(currentUser.id);
        if (!bankInfo) {
            alert('请先设置银行卡信息');
            return;
        }
        
        // 创建提现记录 - 这会自动创建类
        const Withdrawal = AV.Object.extend('Withdrawal');
        const withdrawal = new Withdrawal();
        
        withdrawal.set('user', currentUser);
        withdrawal.set('amount', withdrawAmount);
        withdrawal.set('status', 'pending');
        withdrawal.set('bankInfo', bankInfo);
        withdrawal.set('adminNotificationSent', false);
        
        await withdrawal.save();
        
        alert('提现申请已提交，等待管理员审核');
        
        // 重新加载提现数据
        loadWithdrawData();
        
    } catch (error) {
        console.error('申请提现失败:', error);
        alert('申请提现失败: ' + error.message);
    } finally {
        // 恢复提交按钮
        submitBtn.disabled = false;
        submitBtn.textContent = '申请提现';
    }
}

// 加载个人信息
function loadProfileInfo() {
    const currentUser = AV.User.current();
    
    // 填充表单信息
    document.getElementById('profile-username').value = currentUser.getUsername();
    
    // 角色显示为中文
    const roleMap = {
        'admin': '管理员',
        'agent': '业务员'
    };
    document.getElementById('profile-role').value = roleMap[currentUser.get('role')] || currentUser.get('role');
    
    // 清空密码字段
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

// 更新密码
async function updatePassword() {
    const currentUser = AV.User.current();
    const submitBtn = document.querySelector('#profile-form button[type="submit"]');
    
    // 获取表单数据
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // 表单验证
    if (newPassword.length < 6) {
        alert('新密码长度必须至少为6位');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
    }
    
    // 禁用提交按钮
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 更新中...';
    
    try {
        // 使用旧密码登录验证
        try {
            await AV.User.logIn(currentUser.getUsername(), currentPassword);
        } catch (loginError) {
            alert('当前密码不正确');
            console.error('密码验证失败:', loginError);
            return;
        }
        
        // 更新密码
        currentUser.setPassword(newPassword);
        await currentUser.save();
        
        alert('密码修改成功');
        
        // 清空密码字段
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        
    } catch (error) {
        console.error('更新密码失败:', error);
        alert('更新密码失败: ' + error.message);
    } finally {
        // 恢复提交按钮
        submitBtn.disabled = false;
        submitBtn.textContent = '更新密码';
    }
}

// 添加新的表单提交函数
async function submitClientData(form) {
    const submitBtn = document.getElementById('submit-client-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 提交中...';
    
    try {
        // 获取表单数据
        const name = document.getElementById('client-name').value;
        const phone = document.getElementById('client-phone').value;
        const community = document.getElementById('client-community').value;
        const houseNumber = document.getElementById('client-house-number').value;
        const area = document.getElementById('client-area').value;
        const intention = document.getElementById('client-intention').value;
        const remarks = document.getElementById('client-remarks').value;
        
        // 创建客户数据
        const Client = AV.Object.extend('Client');
        const client = new Client();
        
        client.set('name', name);
        client.set('phone', phone);
        client.set('community', community);
        client.set('houseNumber', houseNumber);
        client.set('area', parseFloat(area));
        client.set('intention', intention);
        client.set('remarks', remarks);
        client.set('status', 'pending');
        client.set('agent', AV.User.current());
        
        await client.save();
        
        // 重置表单
        form.reset();
        
        // 关闭模态框
        closeModal('add-client-modal');
        
        // 提示成功
        alert('客户信息提交成功，等待管理员审核');
        
        // 刷新客户列表和仪表盘数据
        if (document.querySelector('.nav-link.active').getAttribute('data-tab') === 'clients') {
            loadClientsList();
        } else {
            loadDashboardData();
        }
        
    } catch (error) {
        console.error('添加客户失败:', error);
        alert('添加客户失败: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
} 