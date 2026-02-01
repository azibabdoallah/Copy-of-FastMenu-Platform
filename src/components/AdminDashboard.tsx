// ... (الإبقاء على جميع الـ imports كما هي)

const AdminDashboard: React.FC<AdminDashboardProps> = ({ config: initialConfig, onUpdate, onLogout }) => {
  // ... (الإبقاء على الـ states الأولى كما هي)

  // --- تحديث دالة جلب الطلبات لمنع تداخل البيانات ---
  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) setLoadingOrders(true);
    try {
        // الحصول على الجلسة الحالية للتأكد من هوية المستخدم
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const data = await getOrders(); 
        
        // ملاحظة: يجب التأكد من أن ملف orderService.ts يحتوي على .eq('restaurant_id', session.user.id)
        // إذا لم يكن كذلك، سنقوم بالفلترة هنا كخطوة أمان إضافية:
        const myOrders = data.filter(o => o.restaurant_id === session.user.id);

        if (processedOrdersRef.current.size === 0 && myOrders.length > 0) {
            myOrders.forEach(o => o.id && processedOrdersRef.current.add(o.id));
        }

        if (myOrders.length > previousOrderCountRef.current && previousOrderCountRef.current !== 0) {
            playNotificationSound();
            const newOrders = myOrders.filter(o => o.id && !processedOrdersRef.current.has(o.id));
            if (newOrders.length > 0) {
                newOrders.forEach(o => o.id && processedOrdersRef.current.add(o.id));
                if (autoPrint) {
                    newOrders.forEach(order => printOrderReceipt(order));
                }
            }
        }
        
        previousOrderCountRef.current = myOrders.length;
        setOrders(myOrders); // نضع فقط الطلبات الخاصة بالمطعم الحالي
    } catch (error) {
        console.error("Error fetching orders:", error);
    } finally {
        if (!isBackground) setLoadingOrders(false);
    }
  };

  // --- تحسين منطق الإحصائيات ليكون معزولاً تماماً ---
  const analyticsData = useMemo(() => {
    // نستخدم فقط الطلبات التي تم جلبها بالفعل (وهي مفلترة مسبقاً في fetchOrders)
    const completedOrders = orders.filter(o => o.status === 'completed');
    
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const todayStart = normalizeDate(now);

    const filteredOrders = completedOrders.filter(o => {
        if (!o.created_at) return false;
        const orderDate = new Date(o.created_at);
        const orderTime = normalizeDate(orderDate);

        if (analyticsRange === 'today') return orderTime === todayStart;
        if (analyticsRange === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return orderTime >= normalizeDate(weekAgo);
        }
        if (analyticsRange === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setDate(now.getDate() - 30);
            return orderTime >= normalizeDate(monthAgo);
        }
        if (analyticsRange === 'custom') {
            const selected = new Date(customDate);
            return orderTime === normalizeDate(selected);
        }
        return true;
    });

    const periodRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const periodCount = filteredOrders.length;
    
    // حساب الأطباق الأكثر مبيعاً للمطعم الحالي فقط
    const dishCounts: Record<string, number> = {};
    filteredOrders.forEach(o => {
        o.items.forEach(item => {
            dishCounts[item.dish.name] = (dishCounts[item.dish.name] || 0) + item.quantity;
        });
    });

    const bestSellers = Object.entries(dishCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return { 
        periodRevenue, 
        periodCount, 
        averageOrderValue: periodCount > 0 ? periodRevenue / periodCount : 0,
        bestSellers,
        maxSoldCount: bestSellers.length > 0 ? bestSellers[0].count : 0
    };
  }, [orders, analyticsRange, customDate]);

  // --- زر الحذف النهائي مع تأكيد (إصلاح المشكلة رقم 3) ---
  const handleDeleteDish = async (dishId: string) => {
    // نافذة تأكيد احترافية
    const confirmDelete = window.confirm('⚠️ تحذير: هل أنت متأكد من حذف هذا الطبق نهائياً؟ لا يمكن التراجع عن هذه الخطوة.');
    
    if (confirmDelete) {
        setIsSaving(true);
        try {
            // استدعاء دالة الحذف من السيرفس (تأكد أنها تحذف من جدول items)
            const success = await handleDelete('items', dishId); 
            if (success) {
                setConfig(prev => ({
                    ...prev,
                    dishes: prev.dishes.filter(d => d.id !== dishId)
                }));
                setEditingDish(null);
                alert('تم الحذف بنجاح ✅');
            }
        } catch (error) {
            alert('حدث خطأ أثناء الحذف، حاول مرة أخرى.');
        } finally {
            setIsSaving(false);
        }
    }
  };

  // ... (بقية الكود الخاص بالـ UI كما هو)
