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
    // @TODO: Проверка входных данных
    if (!data
    || !Array.isArray(data.sellers)
    || data.sellers.length === 0
) {
    throw new Error('Некорректные входные данные');
}

    // Проверка наличия опций

    const { calculateRevenue, calculateBonus } = options;
    // Сюда передадим функции для расчётов

    // Проверка переменных

    if (!calculateRevenue || !calculateBonus) {
    throw new Error('Переменные - это не функция');
} 
    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.last_name} ${seller.first_name}`,
        sales_count: 0,
        revenue: 0,
        profit: 0,
        products_sold: {},
        top_products: {},
        bonus: 0
    })); 

    // Индексация продавцов и товаров для быстрого доступа
    const productIndex = Object.fromEntries(
    (data.products || []).map(product => [product.sku, product])
    );

    const sellerIndex = Object.fromEntries(
    sellerStats.map(seller => [seller.id, seller])
    );

    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
    const seller = sellerIndex[record.seller_id]; // Продавец

    if (!seller) {
        console.warn("Продавец не найден:", record.seller_id);
        return;
    }

    // Увеличить количество продаж 
    seller.sales_count += 1;

    // Увеличить общую сумму всех продаж 
    seller.revenue += Number(record.total_amount) || 0;

    // Расчёт прибыли для каждого товара
    record.items.forEach(item => {
        const product = productIndex[item.sku]; // Товар

        if (!product) {
            console.warn("Товар не найден:", item.sku);
            return;
        }

        // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
        const quantity = Number(item.quantity) || 0;
        const cost = (Number(product.purchase_price) || 0) * quantity;

        // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
        const revenue = calculateSimpleRevenue(item, product);

        // Посчитать прибыль: выручка минус себестоимость
        const profit = revenue - cost;

        // Увеличить общую накопленную прибыль (profit) у продавца  
        seller.profit += profit;

        // Учёт количества проданных товаров
        if (!seller.products_sold[item.sku]) {
            seller.products_sold[item.sku] = 0;
        }
        // По артикулу товара увеличить его проданное количество у продавца
        seller.products_sold[item.sku] += quantity;

        // Обновляем топ-продукты продавца
        seller.top_products[item.sku] = seller.products_sold[item.sku];
        });
    });


    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
    // Считаем бонус по позиции в рейтинге
    seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);

    // Формируем топ-10 товаров
    seller.top_products = Object.entries(seller.products_sold || {}) // [[sku, quantity], ...]
        .map(([sku, quantity]) => ({ sku, quantity })) // [{sku, quantity}, ...]
        .sort((a, b) => b.quantity - a.quantity) // сортируем по убыванию количества
        .slice(0, 10); // берём первые 10
});

    // Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
    seller_id: seller.id, // Идентификатор продавца
    name: seller.name, // Имя продавца
    revenue: +seller.revenue.toFixed(2), // Выручка с двумя знаками после точки
    profit: +seller.profit.toFixed(2), // Прибыль с двумя знаками после точки
    sales_count: seller.sales_count, // Количество продаж
    top_products: seller.top_products, // Топ-10 товаров
    bonus: +seller.bonus.toFixed(2) // Бонус с двумя знаками после точки
}));
}
