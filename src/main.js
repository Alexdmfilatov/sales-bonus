/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountFactor = 1 - (discount / 100);
    return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) { // первый в рейтинге
        return profit * 0.15;
    } else if (index === 1 || index === 2) { // второй и третий
        return profit * 0.10;
    } else if (index === total - 1) { // последний
        return 0;
    } else { // все остальные
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || !Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    if (!Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('Некорректные входные данные: products пуст');
    }

    if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные: purchase_records пуст');
    }

    // Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Переменные - это не функция');
    }

    // Подготовка промежуточных данных
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`, // Имя Фамилия
        sales_count: 0,
        revenue: 0,
        profit: 0,
        products_sold: {},
        top_products: {},
        bonus: 0
    }));

    // Индексация продавцов и товаров
    const productIndex = Object.fromEntries(
        (data.products || []).map(product => [product.sku, product])
    );

    const sellerIndex = Object.fromEntries(
        sellerStats.map(seller => [seller.id, seller])
    );

    // Расчет выручки и прибыли
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];

        if (!seller) return; // Пропустить, если продавец не найден

        seller.sales_count += 1;
        seller.revenue += Number(record.total_amount) || 0;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return; // Пропустить, если товар не найден

            const quantity = Number(item.quantity) || 0;
            const cost = (Number(product.purchase_price) || 0) * quantity;

            const revenue = calculateSimpleRevenue(item, product);
            const profit = revenue - cost;

            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += quantity;
        });
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий и топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);

        seller.top_products = Object.entries(seller.products_sold || {})
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Формирование итогового отчёта
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
