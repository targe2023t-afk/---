// ==================== EXCEL EXPORT - تصدير تقرير الجرد ====================

const ExcelExport = {

    // تصدير تقرير الجرد لكل الأقسام كملف Excel
    async exportInventoryReport() {
        const products = Storage.getProducts();
        const categories = Storage.getCategories();
        const entities = Storage.getEntities().filter(e => e.type === 'entity');
        const today = new Date().toLocaleDateString('ar-SA');

        // تجميع الأصناف حسب القسم
        const productsByCategory = {};
        categories.forEach(cat => {
            productsByCategory[cat.name] = products.filter(p => p.categoryId === cat.id || p.category === cat.name);
        });

        // أصناف بدون قسم
        const uncategorized = products.filter(p => !p.categoryId && !categories.find(c => c.name === p.category));
        if (uncategorized.length > 0) {
            productsByCategory['غير مصنف'] = uncategorized;
        }

        // إنشاء workbook جديد
        const workbook = XLSX.utils.book_new();

        // ====== الورقة الأولى: غلاف التقرير ======
        const coverData = [
            [''],
            ['محضر جرد الأصناف'],
            [''],
            ['الجهة:', 'المخزن الرئيسي'],
            ['تاريخ الجرد:', today],
            ['الجارد:', '_________________'],
            [''],
            ['ملاحظة:', 'الخلايا الملونة بالأصفر هي خلايا للملء يدوياً أثناء الجرد'],
        ];

        const coverSheet = XLSX.utils.aoa_to_sheet(coverData);
        // تنسيق الغلاف
        coverSheet['!cols'] = [
            { wch: 25 }, { wch: 40 }
        ];
        coverSheet['!merges'] = [
            { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }
        ];
        // تنسيق الخلايا
        if (!coverSheet['B1']) coverSheet['B1'] = {};
        coverSheet['B1'].s = { font: { bold: true, sz: 22, color: { rgb: '1a5490' } }, alignment: { horizontal: 'center' } };

        XLSX.utils.book_append_sheet(workbook, coverSheet, 'الغلاف');

        // ====== ورقة ملخص الأقسام ======
        let summaryData = [
            ['م', 'القسم', 'عدد الأصناف', 'الرصيد الدفتري', 'الموجود فعلياً', 'العجز', 'الزيادة']
        ];

        let idx = 1;
        let totalProductsAll = 0;
        let totalLedgerAll = 0;

        for (const [catName, catProducts] of Object.entries(productsByCategory)) {
            if (catProducts.length === 0) continue;
            const ledger = catProducts.reduce((sum, p) => {
                const entityStock = Object.values(p.entityStock || {}).reduce((a, b) => a + b, 0);
                return sum + (p.stock || 0) + entityStock;
            }, 0);
            totalProductsAll += catProducts.length;
            totalLedgerAll += ledger;
            summaryData.push([
                idx++, catName, catProducts.length, ledger, '', '', ''
            ]);
        }

        summaryData.push(['', 'الإجمالي', totalProductsAll, totalLedgerAll, '', '', '']);

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        summarySheet['!cols'] = [
            { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }
        ];
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص الأقسام');

        // ====== ورقة لكل قسم ======
        for (const [catName, catProducts] of Object.entries(productsByCategory)) {
            if (catProducts.length === 0) continue;

            let sheetData = [
                ['محضر جرد الأصناف - ' + catName],
                [''],
                ['م', 'كود الصنف', 'اسم الصنف', 'الوحدة', 'الموجود من واقع الجرد', 'حالة الصنف', 'الرصيد الدفتري', 'العجز', 'الزيادة', 'سعر الوحدة', 'القيمة']
            ];

            let catTotal = 0;

            catProducts.forEach((p, i) => {
                const entityStock = Object.values(p.entityStock || {}).reduce((a, b) => a + b, 0);
                const totalStock = (p.stock || 0) + entityStock;
                catTotal += totalStock;

                sheetData.push([
                    i + 1,
                    p.code,
                    p.name,
                    'بالعدد',
                    '',  // للملء يدوياً
                    '',  // للملء يدوياً
                    totalStock,
                    '',  // للملء يدوياً
                    '',  // للملء يدوياً
                    p.unitPrice || '',
                    ''   // للملء يدوياً
                ]);
            });

            // صف الإجمالي
            sheetData.push([
                '', 'إجمالي ' + catName, '', '', '', '', catTotal, '', '', '', ''
            ]);

            // صف التوقيعات
            sheetData.push(['']);
            sheetData.push(['']);
            sheetData.push(['توقيع الجارد:', '', '', '', 'توقيع المشرف:', '', '', '', 'توقيع المدير:', '', '']);

            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            // تعيين عرض الأعمدة
            ws['!cols'] = [
                { wch: 5 },   // م
                { wch: 12 },  // كود
                { wch: 30 },  // اسم
                { wch: 10 },  // وحدة
                { wch: 18 },  // موجود فعلي
                { wch: 12 },  // حالة
                { wch: 15 },  // دفتري
                { wch: 10 },  // عجز
                { wch: 10 },  // زيادة
                { wch: 12 },  // سعر
                { wch: 12 }   // قيمة
            ];

            // دمج خلايا العنوان
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }
            ];

            // حفظ الورقة
            const safeSheetName = catName.replace(/[\/*?:\[\]]/g, '_').substring(0, 31);
            XLSX.utils.book_append_sheet(workbook, ws, safeSheetName);
        }

        // ====== ورقة ملخص الجهات ======
        let entityData = [
            ['م', 'اسم الجهة', 'عدد الأصناف', 'إجمالي العهدة', 'عدد المزادات', 'قيمة المزادات']
        ];

        entities.forEach((e, i) => {
            const stats = Storage.getEntityStats(e.id);
            entityData.push([
                i + 1,
                e.name,
                stats.productCount,
                stats.totalStock,
                stats.consumedCount,
                stats.consumedValue
            ]);
        });

        const entitySheet = XLSX.utils.aoa_to_sheet(entityData);
        entitySheet['!cols'] = [
            { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(workbook, entitySheet, 'ملخص الجهات');

        // ====== تصدير الملف ======
        const fileName = `محضر_جرد_${today.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, fileName, { compression: true });

        showToast('تم تصدير محضر الجرد كملف Excel بنجاح', 'success');
    },

    // تصدير بيانات JSON للتحميل
    exportJSON() {
        const data = {
            products: Storage.getProducts(),
            movements: Storage.getMovements(),
            consumed: Storage.getConsumed(),
            entities: Storage.getEntities(),
            categories: Storage.getCategories(),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('تم تصدير النسخة الاحتياطية', 'success');
    }
};
