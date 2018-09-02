'use strict';
// this simulator simulate behavior of a cobinhood exchange with real data
// only check price to execute orders, and order is always 'filled'
// (partially filled is not simulated)

const Cobinhood = require('./cobinhood');
const Wallet = require('./wallet');
const Debug = require('../lib/debug');

class CobinhoodSimulator {

    // simulate: exchange process order
    processOrders() {
        this.orders.forEach(order => {
            const isBuy = order.amount > 0;
            const amount = Math.abs(order.amount);
            const base = order.pair.split('-')[0];
            const quote = order.pair.split('-')[1];
            const quoteAmount = base * amount;
            // check price
            const orderBooks = this.cobinhood.orderBooks;
            console.log(order.price, orderBooks[order.pair].getLowestAsk());
            if ((isBuy && order.price < orderBooks[order.pair].getLowestAsk().price) ||
                (!isBuy && order.price > orderBooks[order.pair].getHighestBid().price)) {
                return;
            } 
            // execute order
            if (isBuy) {
                this.wallet.deposit(base, amount);
            }
            else {
                this.wallet.deposit(quote, quoteAmount);
            }
            // remove order from orders
            Debug.success([this.TAG, `Execute order: ${order.ID}` ]);
            order.onOrderStateChanged({
                status: 'filled'
            });
        });
    }

    // simulate: put order on order book
    makeOrder(order) {
        // check wallet balance
        const isBuy = order.amount > 0;
        const amount = Math.abs(order.amount);
        const base = order.pair.split('-')[0];
        const quote = order.pair.split('-')[1];
        const quoteAmount = order.price * amount;

        if ((isBuy && this.wallet.withdraw(quote, quoteAmount)) || 
            (!isBuy && this.wallet.withdraw(base, amount))) {
            order.ID = '' + this.orders.length;
            order.onOrderMade({
                status: 'success',
                orderID: order.ID
            })
            this.orders.push(order);
        }
        else {
            order.onOrderMade({
                status: 'failed',
                msg: 'Balance not enough.'
            });
        }
    }

    // simulate: exchange maintain wallet
    getWallet() {
        return this.wallet;
    }

    constructor(subscribedPairs) {
        this.TAG = 'Cobinhood Simulator';
        this.cobinhood = new Cobinhood(subscribedPairs);
        this.orderBooks = this.cobinhood.orderBooks;
        // simulate 
        this.wallet = new Wallet({ ETH: 100, USDT: 1000 });
        this.orders = [];
        // execute order every 500 ms
        setInterval(() => {
            this.processOrders();
        }, 500);
    }
}

module.exports = CobinhoodSimulator;