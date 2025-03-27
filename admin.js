document.addEventListener('DOMContentLoaded', function() {
    // 检查用户登录状态
    const currentUser = checkLogin();
    if (!currentUser) return;
    
    // 检查用户角色
    if (currentUser.get('role') !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // 显示管理员名称
    document.getElementById('admin-name').textContent = '管理员：' + currentUser.getUsername();
    
    // 加载初始数据
    loadAdminDashboard();
    
    // 添加标签切换事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            
            // 激活选中的导航项
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            
            // 显示对应的内容区域
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            document.getElementById(tabId + '-tab').style.display = 'block';
            
            // 移动端自动收起导航菜单
            const navbarCollapse = document.getElementById('navbarNav');
            if (navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
            }
            
            // 加载对应的数据
            switch(tabId) {
                case 'admin-dashboard':
                    loadAdminDashboard();
                    break;
                case 'client-verification':
                    loadClientVerification();
                    break;
                case 'client-list':
                    loadClientList();
                    break;
                case 'agent-management':
                    loadAgentManagement();
                    break;
                case 'withdraw-approval':
                    loadWithdrawApproval();
                    break;
            }
        });
    });
    
    // 退出登录
    document.getElementById('admin-logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        AV.User.logOut().then(() => {
            window.location.href = 'index.html';
        });
    });
    
    // 客户审核筛选
    document.getElementById('verify-filter').addEventListener('change', function() {
        loadClientVerification(this.value);
    });
    
    // 提现筛选事件
    document.getElementById('withdraw-filter').addEventListener('change', function() {
        loadWithdrawApproval(this.value);
    });

    // 添加搜索功能
    document.getElementById('client-search-btn').addEventListener('click', function() {
        const searchQuery = document.getElementById('client-search').value.trim();
        loadClientList(searchQuery);
    });

    // 添加搜索框回车事件
    document.getElementById('client-search').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            const searchQuery = this.value.trim();
            loadClientList(searchQuery);
        }
    });

    // 添加客户按钮点击事件
    const addClientBtn = document.getElementById('add-client-btn');
    if (addClientBtn) {
        addClientBtn.addEventListener('click', function() {
            safeShowModal('add-client-modal');
        });
    }

    // 替换所有模态框触发按钮的行为
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach(button => {
        const modalId = button.getAttribute('data-bs-target').replace('#', '');
        
        // 移除Bootstrap属性
        button.removeAttribute('data-bs-toggle');
        button.removeAttribute('data-bs-target');
        
        // 添加点击事件
        button.addEventListener('click', function() {
            safeShowModal(modalId);
        });
    });

    // 添加窗口大小变化时重新加载视图的监听器
    window.addEventListener('resize', function() {
        // 获取当前活动的标签页
        const activeTab = document.querySelector('.nav-link.active');
        if (!activeTab) return;
        
        const tabId = activeTab.getAttribute('data-tab');
        
        // 如果是仪表盘页面，重新加载最近客户和业务员排行
        if (tabId === 'admin-dashboard') {
            loadRecentClients();
            loadAgentRanking();
        }
        // 可以为其他标签页添加类似的逻辑
    });
});

// 加载管理员仪表盘
async function loadAdminDashboard() {
    try {
        // 统计数据查询
        const clientQuery = new AV.Query('Client');
        const pendingClientQuery = new AV.Query('Client');
        pendingClientQuery.equalTo('status', 'pending');
        
        const withdrawalQuery = new AV.Query('Withdrawal');
        const pendingWithdrawalQuery = new AV.Query('Withdrawal');
        pendingWithdrawalQuery.equalTo('status', 'pending');
        
        // 并行执行查询
        const [clientCount, pendingClientCount, withdrawalCount, pendingWithdrawalCount] = await Promise.all([
            clientQuery.count(),
            pendingClientQuery.count(),
            withdrawalQuery.count(),
            pendingWithdrawalQuery.count()
        ]);
        
        // 更新UI - 不再显示业务员数量
        document.getElementById('total-clients').textContent = clientCount;
        document.getElementById('pending-clients').textContent = pendingClientCount;
        document.getElementById('pending-withdrawals').textContent = pendingWithdrawalCount;
        
        // 恢复以下两行，加载最近客户和业务员排行数据
        await loadRecentClients();
        await loadAgentRanking();
        
        // 检查是否有新的待审核客户
        await checkNewClientsAndNotify();
        
        // 检查新提现申请并通知
        await checkNewWithdrawalsAndNotify();
        
    } catch (error) {
        console.error('加载管理员仪表盘失败:', error);
        alert('加载管理员仪表盘失败：' + error.message);
    }
}

// 加载最近客户
async function loadRecentClients() {
    try {
        const query = new AV.Query('Client');
        query.include('agent');
        query.descending('createdAt');
        query.limit(5);
        const clients = await query.find();
        
        // 检测是否为移动端
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // 移动端卡片视图
            let cardsHtml = '';
            for (const client of clients) {
                cardsHtml += renderMobileClientCard(client);
            }
            document.getElementById('recent-clients-cards').innerHTML = cardsHtml;
        } else {
            // 桌面端表格视图
            let tableHtml = '';
            for (const client of clients) {
                tableHtml += renderRecentClient(client);
            }
            document.getElementById('recent-clients-table').innerHTML = tableHtml;
        }
    } catch (error) {
        console.error('加载最近客户失败:', error);
    }
}

// 移动端客户卡片渲染函数
function renderMobileClientCard(client) {
    const agentName = client.get('agent') ? client.get('agent').get('username') : '未知';
    const status = client.get('status');
    const statusClass = status === 'pending' ? 'pending' : 'verified';
    const statusText = status === 'pending' ? '待审核' : '已审核';
    
    return `
    <div class="mobile-card">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mobile-card-title mb-0">${client.get('name')}</h6>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="mobile-card-row">
            <span class="mobile-card-label">小区</span>
            <span class="mobile-card-value">${client.get('community') || '未知'}</span>
        </div>
        <div class="mobile-card-row">
            <span class="mobile-card-label">业务员</span>
            <span class="mobile-card-value">${agentName}</span>
        </div>
        <div class="mobile-card-row">
            <span class="mobile-card-label">提交时间</span>
            <span class="mobile-card-value">${formatDate(client.createdAt)}</span>
        </div>
    </div>`;
}

// 在loadRecentClients函数中更新生成的HTML
function renderRecentClient(client) {
    const agentName = client.get('agent') ? client.get('agent').get('username') : '未知';
    const status = client.get('status');
    const statusClass = status === 'pending' ? 'pending' : 'verified';
    const statusText = status === 'pending' ? '待审核' : '已审核';
    
    return `<tr>
        <td><strong>${client.get('name')}</strong></td>
        <td>${client.get('community') || '未知'}</td>
        <td>${agentName}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    </tr>`;
}

// 加载业务员排行
async function loadAgentRanking() {
    try {
        // 获取所有客户数据
        const clientQuery = new AV.Query('Client');
        clientQuery.include('agent');
        const clients = await clientQuery.find();
        
        // 统计每个业务员的客户数量
        const agentStats = {};
        
        for (const client of clients) {
            const agent = client.get('agent');
            if (!agent) continue;
            
            const agentId = agent.id;
            if (!agentStats[agentId]) {
                agentStats[agentId] = {
                    agent: agent,
                    totalClients: 0,
                    verifiedClients: 0
                };
            }
            
            agentStats[agentId].totalClients++;
            if (client.get('status') === 'verified') {
                agentStats[agentId].verifiedClients++;
            }
        }
        
        // 转换为数组并排序
        const sortedAgents = Object.values(agentStats).sort((a, b) => b.totalClients - a.totalClients);
        
        if (sortedAgents.length === 0) {
            document.getElementById('agent-ranking-cards').innerHTML = '<div class="text-center p-4">暂无业务员数据</div>';
            return;
        }
        
        // 最多取前5名
        const topAgents = sortedAgents.slice(0, 5);
        
        // 检测是否为移动端
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // 移动端卡片视图
            let cardsHtml = '';
            for (let i = 0; i < topAgents.length && i < 5; i++) {
                cardsHtml += renderMobileAgentRankCard(topAgents[i], i+1);
            }
            document.getElementById('agent-ranking-cards').innerHTML = cardsHtml;
        } else {
            // 桌面端表格视图
            let tableHtml = '';
            for (let i = 0; i < topAgents.length && i < 5; i++) {
                tableHtml += `
                <tr>
                    <td>${i+1}</td>
                    <td>${topAgents[i].agent.getUsername()}</td>
                    <td>${topAgents[i].totalClients}</td>
                    <td>${topAgents[i].verifiedClients}</td>
                </tr>`;
            }
            document.getElementById('agent-ranking-table').innerHTML = tableHtml;
        }
    } catch (error) {
        console.error('加载业务员排行失败:', error);
    }
}

// 移动端业务员排行卡片渲染函数
function renderMobileAgentRankCard(agent, rank) {
    let rankClass = '';
    if (rank === 1) rankClass = 'top1';
    else if (rank === 2) rankClass = 'top2';
    else if (rank === 3) rankClass = 'top3';
    
    return `
    <div class="mobile-card">
        <div class="d-flex align-items-center mb-3">
            <span class="rank-badge ${rankClass}">${rank}</span>
            <h6 class="mobile-card-title mb-0">${agent.agent.getUsername()}</h6>
        </div>
        <div class="d-flex justify-content-between">
            <div>
                <div class="mobile-card-row">
                    <span class="mobile-card-label">提交客户</span>
                    <span class="mobile-card-value">${agent.totalClients}位</span>
                </div>
                <div class="mobile-card-row">
                    <span class="mobile-card-label">已审核</span>
                    <span class="mobile-card-value">${agent.verifiedClients}位</span>
                </div>
            </div>
            <div class="d-flex align-items-center">
                <div class="progress-stats">
                    <span class="completed">${Math.round(agent.verifiedClients/agent.totalClients*100)}%</span>
                </div>
            </div>
        </div>
    </div>`;
}

// 格式化日期助手函数
function formatDate(date) {
    if (!date) return '未知';
    const options = { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('zh-CN', options);
}

// 加载客户审核列表
async function loadClientVerification(filterType = 'pending') {
    const isMobile = window.innerWidth < 768;
    const verificationListContainer = isMobile ? 
        document.getElementById('verify-clients-cards') : 
        document.getElementById('verify-clients-table');
    
    showLoading(verificationListContainer);
    
    try {
        const query = new AV.Query('Client');
        query.include('agent');
        
        if (filterType === 'verified') {
            query.equalTo('status', 'verified');
        } else if (filterType === 'pending') {
            query.equalTo('status', 'pending');
        }
        
        query.descending('createdAt');
        const clients = await query.find();
        
        if (clients.length === 0) {
            if (isMobile) {
                // 移动端空数据显示
                verificationListContainer.innerHTML = '<div class="text-center p-4">暂无客户数据</div>';
            } else {
                // 桌面端空数据显示
                verificationListContainer.innerHTML = '<tr><td colspan="8" class="text-center">暂无客户数据</td></tr>';
            }
            return;
        }
        
        if (isMobile) {
            // 移动端卡片式布局
            let html = '<div class="client-cards-container">';
            
            for (const client of clients) {
                const clientId = client.id;
                const name = client.get('name');
                const phone = client.get('phone');
                const community = client.get('community');
                const houseNumber = client.get('houseNumber');
                const area = client.get('area');
                const intention = client.get('intention');
                const status = client.get('status');
                const agentName = client.get('agent') ? client.get('agent').getUsername() : '未分配';
                const remarks = client.get('remarks') || '';
                
                // 获取意向度文本
                const intentionText = getIntentionLevel(intention);
                
                // 卡片HTML
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
                                    <small class="text-muted">业务员</small>
                                    <p class="mb-0">${agentName}</p>
                                </div>
                            </div>
                            <div class="mt-3 d-grid">
                                ${status === 'pending' ? 
                                    `<button class="btn btn-sm btn-success verify-client-btn" data-id="${clientId}">
                                        <i class="bi bi-check-circle me-1"></i>审核通过
                                    </button>` : 
                                    `<button class="btn btn-sm btn-outline-secondary" disabled>
                                        <i class="bi bi-check-circle-fill me-1"></i>已审核
                                    </button>`
                                }
                            </div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            verificationListContainer.innerHTML = html;
            
            // 添加审核按钮事件
            document.querySelectorAll('.verify-client-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const clientId = this.getAttribute('data-id');
                    verifyClientById(clientId);
                });
            });
            
        } else {
            // 桌面端表格布局
            let html = '';
            
            for (const client of clients) {
                const clientId = client.id;
                const name = client.get('name');
                const phone = client.get('phone');
                const community = client.get('community');
                const houseNumber = client.get('houseNumber');
                const area = client.get('area');
                const intention = client.get('intention');
                const status = client.get('status');
                const agent = client.get('agent');
                const agentName = agent ? agent.getUsername() : '未分配';
                
                // 获取意向度文本
                const intentionText = getIntentionLevel(intention);
                
                html += `
                    <tr>
                        <td>${name}</td>
                        <td>${phone}</td>
                        <td>${community}</td>
                        <td>${houseNumber}</td>
                        <td>${area} m²</td>
                        <td>${agentName}</td>
                        <td>${getStatusBadge(status)}</td>
                        <td>
                            ${status === 'pending' ? 
                                `<button class="btn btn-sm btn-success verify-client-btn" data-id="${clientId}">
                                    <i class="bi bi-check-circle me-1"></i>审核
                                </button>` : 
                                `<button class="btn btn-sm btn-outline-secondary" disabled>
                                    <i class="bi bi-check-circle-fill me-1"></i>已审核
                                </button>`
                            }
                        </td>
                    </tr>
                `;
            }
            
            verificationListContainer.innerHTML = html;
            
            // 添加审核按钮事件
            document.querySelectorAll('.verify-client-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const clientId = this.getAttribute('data-id');
                    verifyClientById(clientId);
                });
            });
        }
        
        // 为窗口大小变化添加监听器
        if (!window.clientVerificationResizeListener) {
            window.clientVerificationResizeListener = true;
            window.addEventListener('resize', function() {
                // 当窗口大小改变时，如果当前页面是客户审核，则重新加载
                const activeTab = document.querySelector('.nav-link.active');
                if (activeTab && activeTab.getAttribute('data-tab') === 'client-verification') {
                    loadClientVerification(document.getElementById('verify-filter').value);
                }
            });
        }
        
    } catch (error) {
        console.error('加载审核列表失败:', error);
        if (isMobile) {
            verificationListContainer.innerHTML = '<div class="alert alert-danger">加载失败，请刷新页面重试</div>';
        } else {
            verificationListContainer.innerHTML = '<tr><td colspan="8" class="text-center text-danger">加载失败，请刷新页面重试</td></tr>';
        }
    }
}

// 修改客户详情查看函数
async function showClientDetail(clientId) {
    try {
        const query = new AV.Query('Client');
        query.include('agent');
        const client = await query.get(clientId);
        
        const name = client.get('name');
        const phone = client.get('phone');
        const community = client.get('community');
        const houseNumber = client.get('houseNumber');
        const area = client.get('area');
        const intention = client.get('intention');
        const remarks = client.get('remarks') || '';
        const agent = client.get('agent');
        const agentName = agent ? agent.getUsername() : '未分配';
        const createdAt = formatDate(client.createdAt);
        
        // 获取意向度文本
        const intentionText = getIntentionLevel(intention);
        
        // 显示客户详情模态框
        const detailContent = document.getElementById('client-detail-content');
        if (!detailContent) {
            console.error('找不到客户详情内容元素');
            alert('系统错误：无法显示客户详情');
            return;
        }
        
        detailContent.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                    <strong>客户姓名：</strong>${name}
                </div>
                <div class="col-md-6">
                    <strong>联系电话：</strong>${phone}
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                    <strong>小区名称：</strong>${community}
                </div>
                <div class="col-md-6">
                    <strong>房号：</strong>${houseNumber}
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                    <strong>房屋面积：</strong>${area} m²
                </div>
                <div class="col-md-6">
                    <strong>装修意向度：</strong>${intentionText}
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-md-6 mb-3 mb-md-0">
                    <strong>业务员：</strong>${agentName}
                </div>
                <div class="col-md-6">
                    <strong>提交时间：</strong>${createdAt}
                </div>
            </div>
            <div class="mb-3">
                <strong>备注信息：</strong>
                <p class="mt-1">${remarks || '无'}</p>
            </div>
        `;
        
        // 隐藏审核按钮（因为已经是审核过的客户）
        const verifyButton = document.getElementById('verify-client-btn');
        if (verifyButton) {
            verifyButton.style.display = 'none';
        }
        
        // 使用安全的方式显示模态框
        safeShowModal('client-detail-modal');
    } catch (error) {
        console.error('加载客户详情失败:', error);
        alert('加载客户详情失败，请重试');
    }
}

// 审核客户
async function verifyClient() {
    const clientDetailModal = bootstrap.Modal.getInstance(document.getElementById('client-detail-modal'));
    const clientId = document.getElementById('verify-client-btn').getAttribute('data-client-id');
    
    if (!clientId) {
        alert('无效的客户ID');
        return;
    }
    
    try {
        const query = new AV.Query('Client');
        query.include('agent');
        const client = await query.get(clientId);
        
        // 检查状态
        if (client.get('status') === 'verified') {
            alert('该客户信息已审核');
            return;
        }
        
        // 更新客户状态
        client.set('status', 'verified');
        await client.save();
        
        // 获取业务员
        const agent = client.get('agent');
        const clientName = client.get('name');
        
        // 创建待发送通知
        const Notification = AV.Object.extend('Notification');
        const notification = new Notification();
        
        notification.set('title', '客户信息审核通过');
        notification.set('message', `您提交的客户 ${clientName} 已通过审核，获得50元奖励。`);
        notification.set('user', agent);
        notification.set('isRead', false);
        
        await notification.save();
        
        alert('审核通过，已奖励该业务员50元');
        
        // 关闭模态框
        clientDetailModal.hide();
        
        // 重新加载客户列表
        loadClientVerification(document.getElementById('verify-filter').value);
        
    } catch (error) {
        console.error('审核客户失败:', error);
        alert('审核失败: ' + error.message);
    }
}

// 通过ID审核客户
async function verifyClientById(clientId) {
    if (!confirm('确定审核通过该客户信息？')) {
        return;
    }
    
    try {
        const query = new AV.Query('Client');
        query.include('agent');
        const client = await query.get(clientId);
        
        // 检查状态
        if (client.get('status') === 'verified') {
            alert('该客户已经审核通过');
            return;
        }
        
        // 更新状态
        client.set('status', 'verified');
        await client.save();
        
        // 获取业务员和客户信息
        const agent = client.get('agent');
        const clientName = client.get('name');
        
        // 创建通知给业务员
        const Notification = AV.Object.extend('Notification');
        const notification = new Notification();
        
        notification.set('title', '客户信息审核通过');
        notification.set('message', `您提交的客户 ${clientName} 已审核通过，您将获得相应奖励。`);
        notification.set('user', agent);
        notification.set('isRead', false);
        
        await notification.save();
        
        alert('审核成功');
        
        // 重新加载客户列表
        loadClientVerification(document.getElementById('verify-filter').value);
        
    } catch (error) {
        console.error('审核客户失败:', error);
        alert('审核失败: ' + error.message);
    }
}

// 加载业务员管理
async function loadAgentManagement() {
    const isMobile = window.innerWidth < 768;
    const agentContainer = isMobile ? 
        document.getElementById('agents-cards') : 
        document.getElementById('agents-table');
    
    showLoading(agentContainer);
    
    try {
        // 通过客户表间接获取业务员信息
        const clientQuery = new AV.Query('Client');
        clientQuery.include('agent');
        const clients = await clientQuery.find();
        
        // 收集所有业务员信息
        const agentsMap = {};
        
        for (const client of clients) {
            const agent = client.get('agent');
            if (!agent) continue;
            
            const agentId = agent.id;
            if (!agentsMap[agentId]) {
                agentsMap[agentId] = {
                    id: agentId,
                    username: agent.getUsername(),
                    totalClients: 0,
                    verifiedClients: 0
                };
            }
            
            agentsMap[agentId].totalClients++;
            if (client.get('status') === 'verified') {
                agentsMap[agentId].verifiedClients++;
            }
        }
        
        const agents = Object.values(agentsMap);
        
        if (agents.length === 0) {
            if (isMobile) {
                agentContainer.innerHTML = '<div class="text-center p-4">暂无业务员数据</div>';
            } else {
                agentContainer.innerHTML = '<tr><td colspan="5" class="text-center">暂无业务员数据</td></tr>';
            }
            return;
        }
        
        if (isMobile) {
            // 移动端卡片式布局
            let html = '<div class="agent-cards-container">';
            
            for (const agent of agents) {
                const reward = agent.verifiedClients * 50; // 每个审核通过的客户奖励50元
                
                html += `
                    <div class="card agent-card">
                        <div class="card-header">
                            <h6 class="mb-0">${agent.username}</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">提交客户数</small>
                                    <p class="mb-0">${agent.totalClients}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">已审核客户数</small>
                                    <p class="mb-0">${agent.verifiedClients}</p>
                                </div>
                            </div>
                            
                            <div class="agent-reward text-center">
                                奖励金额: ${formatCurrency(reward)}
                            </div>
                            
                            <div class="mt-3 d-grid">
                                <button class="btn btn-sm btn-outline-primary view-agent-btn" data-id="${agent.id}">
                                    <i class="bi bi-eye me-1"></i>查看客户详情
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            agentContainer.innerHTML = html;
            
        } else {
            // 桌面端表格布局
            let html = '';
            
            for (const agent of agents) {
                const reward = agent.verifiedClients * 50; // 每个审核通过的客户奖励50元
                
                html += `
                    <tr>
                        <td>${agent.username}</td>
                        <td>${agent.totalClients}</td>
                        <td>${agent.verifiedClients}</td>
                        <td>${formatCurrency(reward)}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary view-agent-btn" data-id="${agent.id}">
                                <i class="bi bi-eye me-1"></i>查看
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            agentContainer.innerHTML = html;
        }
        
        // 添加查看按钮事件
        document.querySelectorAll('.view-agent-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const agentId = this.getAttribute('data-id');
                viewAgentDetails(agentId);
            });
        });
        
        // 为窗口大小变化添加监听器
        if (!window.agentResizeListener) {
            window.agentResizeListener = true;
            window.addEventListener('resize', function() {
                // 当窗口大小改变时，如果当前页面是业务员管理，则重新加载
                const activeTab = document.querySelector('.nav-link.active');
                if (activeTab && activeTab.getAttribute('data-tab') === 'agent-management') {
                    loadAgentManagement();
                }
            });
        }
        
    } catch (error) {
        console.error('加载业务员管理数据失败:', error);
        if (isMobile) {
            agentContainer.innerHTML = '<div class="alert alert-danger">加载失败: ' + error.message + '</div>';
        } else {
            agentContainer.innerHTML = '<tr><td colspan="5" class="text-center text-danger">加载失败，请刷新页面重试</td></tr>';
        }
    }
}

// 查看业务员详情
async function viewAgentDetails(agentId) {
    try {
        // 获取该业务员的客户列表
        const clientQuery = new AV.Query('Client');
        clientQuery.equalTo('agent', AV.Object.createWithoutData('_User', agentId));
        clientQuery.include('agent');
        const clients = await clientQuery.find();
        
        if (clients.length === 0) {
            alert('该业务员暂无客户数据');
            return;
        }
        
        // 获取业务员名称
        const agentName = clients[0].get('agent').getUsername();
        
        // 构建详情HTML
        let detailsHTML = `
            <div class="modal fade" id="agent-details-modal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">业务员详情: ${agentName}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h6>客户列表</h6>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>客户姓名</th>
                                            <th>联系电话</th>
                                            <th>小区名称</th>
                                            <th>面积</th>
                                            <th>状态</th>
                                            <th>提交时间</th>
                                        </tr>
                                    </thead>
                                    <tbody>
        `;
        
        for (const client of clients) {
            const name = client.get('name');
            const phone = client.get('phone');
            const community = client.get('community');
            const area = client.get('area');
            const status = client.get('status');
            const createdAt = formatDate(client.createdAt);
            
            detailsHTML += `
                <tr>
                    <td>${name}</td>
                    <td>${phone}</td>
                    <td>${community}</td>
                    <td>${area} m²</td>
                    <td>${getStatusBadge(status)}</td>
                    <td>${createdAt}</td>
                </tr>
            `;
        }
        
        detailsHTML += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除旧模态框
        const oldModal = document.getElementById('agent-details-modal');
        if (oldModal) oldModal.remove();
        
        // 添加新模态框
        document.body.insertAdjacentHTML('beforeend', detailsHTML);
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('agent-details-modal'));
        modal.show();
        
    } catch (error) {
        console.error('查看业务员详情失败:', error);
        alert('查看详情失败: ' + error.message);
    }
}

// 加载提现审批列表
async function loadWithdrawApproval(filterType = 'pending') {
    const isMobile = window.innerWidth < 768;
    const withdrawalContainer = isMobile ? 
        document.getElementById('withdraw-cards') : 
        document.getElementById('withdraw-table');
    
    showLoading(withdrawalContainer);
    
    try {
        const query = new AV.Query('Withdrawal');
        query.include('user');
        
        if (filterType === 'pending') {
            query.equalTo('status', 'pending');
        } else if (filterType === 'completed') {
            query.equalTo('status', 'completed');
        }
        
        query.descending('createdAt');
        const withdrawals = await query.find();
        
        if (withdrawals.length === 0) {
            if (isMobile) {
                // 移动端空数据显示
                withdrawalContainer.innerHTML = '<div class="text-center p-4">暂无提现申请</div>';
            } else {
                // 桌面端空数据显示
                withdrawalContainer.innerHTML = '<tr><td colspan="6" class="text-center">暂无提现申请</td></tr>';
            }
            return;
        }
        
        if (isMobile) {
            // 移动端卡片式布局
            let html = '<div class="withdrawal-cards-container px-2">';
            
            for (const withdrawal of withdrawals) {
                const withdrawalId = withdrawal.id;
                const user = withdrawal.get('user');
                const username = user ? user.getUsername() : '未知用户';
                const amount = withdrawal.get('amount');
                const bankInfo = withdrawal.get('bankInfo');
                const status = withdrawal.get('status');
                const createdAt = formatDate(withdrawal.createdAt);
                
                // 状态标签
                const statusBadge = status === 'pending' ? 
                    '<span class="badge bg-warning text-dark">待处理</span>' : 
                    '<span class="badge bg-success">已处理</span>';
                
                html += `
                    <div class="card withdraw-card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${username}</h6>
                            ${statusBadge}
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-6">
                                    <small class="text-muted">申请时间</small>
                                    <p class="mb-0">${createdAt}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">金额</small>
                                    <p class="mb-0 fw-bold">${formatCurrency(amount)}</p>
                                </div>
                            </div>
                            
                            <div class="bank-info">
                                <small class="text-muted d-block mb-1">银行信息</small>
                                <p class="mb-0">${bankInfo}</p>
                            </div>
                            
                            ${status === 'pending' ? `
                                <div class="mt-3 d-grid">
                                    <button class="btn btn-sm btn-success approve-withdrawal-btn" data-id="${withdrawalId}">
                                        <i class="bi bi-check-circle me-1"></i>确认打款
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            withdrawalContainer.innerHTML = html;
            
            // 添加确认打款按钮事件
            document.querySelectorAll('.approve-withdrawal-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const withdrawalId = this.getAttribute('data-id');
                    approveWithdrawal(withdrawalId);
                });
            });
            
        } else {
            // 桌面端表格布局
            let html = '';
            
            for (const withdrawal of withdrawals) {
                const withdrawalId = withdrawal.id;
                const user = withdrawal.get('user');
                const username = user ? user.getUsername() : '未知用户';
                const amount = withdrawal.get('amount');
                const bankInfo = withdrawal.get('bankInfo');
                const status = withdrawal.get('status');
                const createdAt = formatDate(withdrawal.createdAt);
                
                // 状态标签
                const statusBadge = status === 'pending' ? 
                    '<span class="badge bg-warning text-dark">待处理</span>' : 
                    '<span class="badge bg-success">已处理</span>';
                
                html += `
                    <tr>
                        <td>${username}</td>
                        <td>${createdAt}</td>
                        <td>${formatCurrency(amount)}</td>
                        <td>${bankInfo}</td>
                        <td>${statusBadge}</td>
                        <td>
                            ${status === 'pending' ? `
                                <button class="btn btn-sm btn-success approve-withdrawal-btn" data-id="${withdrawalId}">
                                    <i class="bi bi-check-circle me-1"></i>确认打款
                                </button>
                            ` : '已完成'}
                        </td>
                    </tr>
                `;
            }
            
            withdrawalContainer.innerHTML = html;
            
            // 添加确认打款按钮事件
            document.querySelectorAll('.approve-withdrawal-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const withdrawalId = this.getAttribute('data-id');
                    approveWithdrawal(withdrawalId);
                });
            });
        }
        
        // 为窗口大小变化添加监听器
        if (!window.withdrawalResizeListener) {
            window.withdrawalResizeListener = true;
            window.addEventListener('resize', function() {
                // 当窗口大小改变时，如果当前页面是提现审批，则重新加载
                const activeTab = document.querySelector('.nav-link.active');
                if (activeTab && activeTab.getAttribute('data-tab') === 'withdraw-approval') {
                    loadWithdrawApproval(document.getElementById('withdraw-filter').value);
                }
            });
        }
        
    } catch (error) {
        console.error('加载提现审批列表失败:', error);
        if (isMobile) {
            withdrawalContainer.innerHTML = '<div class="alert alert-danger">加载失败，请刷新页面重试</div>';
        } else {
            withdrawalContainer.innerHTML = '<tr><td colspan="6" class="text-center text-danger">加载失败，请刷新页面重试</td></tr>';
        }
    }
}

// 确认提现打款
async function approveWithdrawal(withdrawalId) {
    if (!confirm('确认已完成打款转账？')) {
        return;
    }
    
    try {
        const query = new AV.Query('Withdrawal');
        query.include('user');
        const withdrawal = await query.get(withdrawalId);
        
        // 检查状态
        if (withdrawal.get('status') !== 'pending') {
            alert('该提现申请已处理');
            return;
        }
        
        // 更新状态
        withdrawal.set('status', 'completed');
        await withdrawal.save();
        
        // 获取用户和金额
        const user = withdrawal.get('user');
        const amount = withdrawal.get('amount');
        
        // 创建待发送通知
        const Notification = AV.Object.extend('Notification');
        const notification = new Notification();
        
        notification.set('title', '提现申请已完成');
        notification.set('message', `您申请提现的 ${formatCurrency(amount)} 已转账到您的银行账户，请查收。`);
        notification.set('user', user);
        notification.set('isRead', false);
        
        await notification.save();
        
        alert('提现处理成功');
        
        // 重新加载提现列表
        loadWithdrawApproval(document.getElementById('withdraw-filter').value);
        
    } catch (error) {
        console.error('处理提现失败:', error);
        alert('处理失败: ' + error.message);
    }
}

// 检查新提交的客户信息并生成通知
async function checkNewClientsAndNotify() {
    try {
        const query = new AV.Query('Client');
        query.equalTo('notificationSent', false);
        query.include('agent');
        
        const newClients = await query.find();
        if (newClients.length === 0) return;
        
        const currentUser = AV.User.current();
        
        for (const client of newClients) {
            const clientName = client.get('name');
            const agentName = client.get('agent').getUsername();
            
            // 创建通知
            await createNotification(
                currentUser,
                '新的客户信息待审核',
                `业务员 ${agentName} 提交了新的客户信息: ${clientName}`
            );
            
            // 标记为已通知
            client.set('notificationSent', true);
            await client.save();
        }
    } catch (error) {
        console.error('检查新客户通知失败:', error);
    }
}

// 检查新提现申请并生成通知
async function checkNewWithdrawalsAndNotify() {
    try {
        const query = new AV.Query('Withdrawal');
        query.equalTo('adminNotificationSent', false);
        query.include('user');
        
        const newWithdrawals = await query.find();
        if (newWithdrawals.length === 0) return;
        
        const currentUser = AV.User.current();
        
        for (const withdrawal of newWithdrawals) {
            const username = withdrawal.get('user').getUsername();
            const amount = withdrawal.get('amount');
            
            // 创建通知
            await createNotification(
                currentUser,
                '新的提现申请',
                `业务员 ${username} 申请提现 ${formatCurrency(amount)}`
            );
            
            // 标记为已通知
            withdrawal.set('adminNotificationSent', true);
            await withdrawal.save();
        }
    } catch (error) {
        console.error('检查新提现申请通知失败:', error);
    }
}

// 加载业务员列表
async function loadAgentsList() {
    const agentsContainer = document.getElementById('agents-list');
    
    try {
        // 获取所有客户数据
        const clientQuery = new AV.Query('Client');
        clientQuery.include('agent');
        const clients = await clientQuery.find();
        
        // 统计每个业务员的客户数量
        const agentStats = {};
        
        for (const client of clients) {
            const agent = client.get('agent');
            if (!agent) continue;
            
            const agentId = agent.id;
            if (!agentStats[agentId]) {
                agentStats[agentId] = {
                    agent: agent,
                    totalClients: 0,
                    verifiedClients: 0
                };
            }
            
            agentStats[agentId].totalClients++;
            if (client.get('status') === 'verified') {
                agentStats[agentId].verifiedClients++;
            }
        }
        
        // 生成表格
        let html = '<table class="table"><thead><tr>' +
            '<th>业务员</th><th>提交客户数</th><th>已审核客户数</th><th>奖励金额</th></tr></thead><tbody>';
        
        for (const agentId in agentStats) {
            const data = agentStats[agentId];
            const agent = data.agent;
            const totalClients = data.totalClients;
            const verifiedClients = data.verifiedClients;
            const reward = verifiedClients * 50; // 每个审核通过的客户奖励50元
            
            html += `
                <tr>
                    <td>${agent.getUsername()}</td>
                    <td>${totalClients}</td>
                    <td>${verifiedClients}</td>
                    <td>${formatCurrency(reward)}</td>
                </tr>
            `;
        }
        
        html += '</tbody></table>';
        agentsContainer.innerHTML = html;
        
    } catch (error) {
        console.error('加载业务员列表失败:', error);
        agentsContainer.innerHTML = '<div class="alert alert-danger">加载业务员列表失败</div>';
    }
}

// 显示加载状态
function showLoading(container) {
    container.innerHTML = `
        <div class="text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
            <p class="mt-2 text-muted">加载中，请稍候...</p>
        </div>
    `;
}

// 加载已审核客户名单
async function loadClientList(searchQuery = '') {
    const isMobile = window.innerWidth < 768;
    const clientListContainer = isMobile ? 
        document.getElementById('verified-clients-cards') : 
        document.getElementById('verified-clients-table');
    
    showLoading(clientListContainer);
    
    try {
        const query = new AV.Query('Client');
        query.equalTo('status', 'verified'); // 只显示已审核的客户
        query.include('agent');
        
        // 添加搜索条件
        if (searchQuery) {
            const nameQuery = new AV.Query('Client');
            nameQuery.equalTo('status', 'verified');
            nameQuery.contains('name', searchQuery);
            
            const phoneQuery = new AV.Query('Client');
            phoneQuery.equalTo('status', 'verified');
            phoneQuery.contains('phone', searchQuery);
            
            const communityQuery = new AV.Query('Client');
            communityQuery.equalTo('status', 'verified');
            communityQuery.contains('community', searchQuery);
            
            query._orQuery([nameQuery, phoneQuery, communityQuery]);
        }
        
        query.descending('updatedAt'); // 按审核时间排序
        const clients = await query.find();
        
        if (clients.length === 0) {
            if (isMobile) {
                clientListContainer.innerHTML = '<div class="text-center p-4">暂无已审核客户数据</div>';
            } else {
                clientListContainer.innerHTML = '<tr><td colspan="5" class="text-center">暂无已审核客户数据</td></tr>';
            }
            return;
        }
        
        if (isMobile) {
            // 移动端卡片式布局
            let html = '<div class="client-cards-container">';
            
            for (const client of clients) {
                const clientId = client.id;
                const name = client.get('name');
                const phone = client.get('phone');
                const community = client.get('community');
                const agent = client.get('agent');
                const agentName = agent ? agent.getUsername() : '未分配';
                
                html += `
                    <div class="card client-card mb-3">
                        <div class="card-header bg-white">
                            <h6 class="mb-0">${name}</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-5">
                                    <small class="text-muted">联系电话</small>
                                    <p class="mb-0">${phone}</p>
                                </div>
                                <div class="col-7">
                                    <small class="text-muted">小区名称</small>
                                    <p class="mb-0">${community}</p>
                                </div>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">业务员</small>
                                <p class="mb-0">${agentName}</p>
                            </div>
                            <div class="mt-3 d-grid">
                                <button class="btn btn-sm btn-outline-primary view-client-detail-btn" data-id="${clientId}">
                                    <i class="bi bi-eye me-1"></i>查看详情
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            clientListContainer.innerHTML = html;
            
        } else {
            // 桌面端表格布局
            let html = '';
            
            for (const client of clients) {
                const clientId = client.id;
                const name = client.get('name');
                const phone = client.get('phone');
                const community = client.get('community');
                const agent = client.get('agent');
                const agentName = agent ? agent.getUsername() : '未分配';
                
                html += `
                    <tr>
                        <td>${name}</td>
                        <td>${phone}</td>
                        <td>${community}</td>
                        <td>${agentName}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary view-client-detail-btn" data-id="${clientId}">
                                <i class="bi bi-eye me-1"></i>查看
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            clientListContainer.innerHTML = html;
        }
        
        // 添加查看详情按钮事件
        document.querySelectorAll('.view-client-detail-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const clientId = this.getAttribute('data-id');
                showClientDetail(clientId);
            });
        });
        
        // 为窗口大小变化添加监听器
        if (!window.clientListResizeListener) {
            window.clientListResizeListener = true;
            window.addEventListener('resize', function() {
                // 当窗口大小改变时，如果当前页面是客户名单，则重新加载
                const activeTab = document.querySelector('.nav-link.active');
                if (activeTab && activeTab.getAttribute('data-tab') === 'client-list') {
                    const searchInput = document.getElementById('client-search');
                    loadClientList(searchInput.value);
                }
            });
        }
        
    } catch (error) {
        console.error('加载客户名单失败:', error);
        if (isMobile) {
            clientListContainer.innerHTML = '<div class="alert alert-danger">加载失败，请刷新页面重试</div>';
        } else {
            clientListContainer.innerHTML = '<tr><td colspan="5" class="text-center text-danger">加载失败，请刷新页面重试</td></tr>';
        }
    }
}

// 安全显示模态框的助手函数
function safeShowModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
        console.error(`模态框元素不存在: ${modalId}`);
        return false;
    }
    
    try {
        // 检查是否已经初始化过
        let bsModal = bootstrap.Modal.getInstance(modalElement);
        
        // 如果没有初始化过，则创建新实例
        if (!bsModal) {
            bsModal = new bootstrap.Modal(modalElement, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
        }
        
        // 显示模态框
        bsModal.show();
        return true;
    } catch (error) {
        console.error('显示模态框时出错:', error);
        
        // 尝试使用原生 DOM API 显示
        try {
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
            document.body.classList.add('modal-open');
            
            // 创建背景遮罩
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
            
            // 添加关闭按钮事件
            const closeButtons = modalElement.querySelectorAll('[data-bs-dismiss="modal"]');
            closeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    modalElement.style.display = 'none';
                    modalElement.classList.remove('show');
                    document.body.classList.remove('modal-open');
                    document.body.removeChild(backdrop);
                });
            });
            
            return true;
        } catch (domError) {
            console.error('尝试使用原生DOM API显示模态框时出错:', domError);
            return false;
        }
    }
}

// 修改所有需要显示模态框的函数
function showAddAgentModal() {
    // 如果有需要的初始化逻辑
    // ...
    
    // 使用安全模态框函数显示
    safeShowModal('add-agent-modal');
} 