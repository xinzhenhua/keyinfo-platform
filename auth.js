// 初始化 LeanCloud
AV.init({
    appId: "9jaNrP32GNBDPyR1kX9pjtLc-gzGzoHsz",
    appKey: "2e38KBVaknfgu16HcdpGmwk0",
    serverURL: "https://9janrp32.lc-cn-n1-shared.com"
});

document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    const currentUser = AV.User.current();
    if (currentUser) {
        // 根据角色重定向
        redirectBasedOnRole(currentUser);
    }
    
    // 登录表单切换
    document.getElementById('register-toggle').addEventListener('click', function() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    });
    
    document.getElementById('login-toggle').addEventListener('click', function() {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });
    
    // 角色选择切换时显示/隐藏验证码字段
    document.getElementById('reg-role').addEventListener('change', function() {
        const adminCodeField = document.getElementById('admin-code-field');
        if (this.value === 'admin') {
            adminCodeField.style.display = 'block';
        } else {
            adminCodeField.style.display = 'none';
        }
    });
    
    // 登录处理
    document.getElementById('login-btn').addEventListener('click', function() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            alert('请输入用户名和密码');
            return;
        }
        
        AV.User.logIn(username, password).then(function(user) {
            redirectBasedOnRole(user);
        }).catch(function(error) {
            alert('登录失败: ' + error.message);
        });
    });
    
    // 注册处理
    document.getElementById('register-btn').addEventListener('click', function() {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;
        const role = document.getElementById('reg-role').value;
        
        if (!username || !password) {
            alert('请输入用户名和密码');
            return;
        }
        
        if (password !== passwordConfirm) {
            alert('两次输入的密码不一致');
            return;
        }
        
        // 如果是管理员角色，验证管理员验证码
        if (role === 'admin') {
            const adminCode = document.getElementById('admin-code').value;
            if (adminCode !== 'Ted135/') {
                alert('管理员验证码错误');
                return;
            }
        }
        
        // 创建新用户
        const user = new AV.User();
        user.setUsername(username);
        user.setPassword(password);
        user.set('role', role);
        
        user.signUp().then(function(user) {
            alert('注册成功！请登录');
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('username').value = username;
        }).catch(function(error) {
            alert('注册失败: ' + error.message);
        });
    });
});

// 根据用户角色重定向
function redirectBasedOnRole(user) {
    const role = user.get('role');
    if (role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'dashboard.html';
    }
} 