const puppeteer = require('puppeteer');
const fs = require('fs');
const { Parser } = require('json2csv');
require('dotenv').config();

async function scraper() {
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    //URL Web
    await page.goto(process.env.WEB_URL);
    
    //Selector MoreButton 
    const moreDataSelector = process.env.MORE_SELECTOR;
    //Selector container list of data
    const containerSelector = process.env.CONTAINER_SELECTOR;

    //Array for add data
    var toCsvArr = [];

    //Declare max value for loop output
    let MAX = 0;

    //MoreButton check condition if can click return data
    const isClickable = await page.$eval(moreDataSelector, async el => {
        const style = window.getComputedStyle(el);
        return style && style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled;

    });

    //Fetch all data until MoreButton cannot click 
    while (isClickable) {
        try {
            
            //Set max value
            MAX = await page.$$eval(containerSelector, containers => containers.length);
            
            //Click more data
            await page.click(moreDataSelector);
        } catch (e) {
            break;
        }
    }
    //Set max value last time 
    MAX = await page.$$eval(containerSelector, containers => containers.length);

    //Looping for data 
    for (let i = 1; i <= MAX; i++) {
        //Data first column 
        //SELECTOR example : #__next > div.features-products-search.search-query- > div:nth-child(3) > div:nth-child(2) > div.result-conteners > div:nth-child(${i}) > a > divdiv.productName
        let elementProductName = await page.waitForSelector(`SELECTOR`, { timeout: 60000 });
        let productName = await page.evaluate(elementProductName => elementProductName.textContent, elementProductName);
        //Data second column
        let elementProductPrice = await page.waitForSelector(`SELECTOR`, { timeout: 60000 });
        let productPriceStr = await page.evaluate(elementProductPrice => elementProductPrice.textContent, elementProductPrice);
        
        //Data third column
        let productPrice = productPriceStr.replace(/[^\d\s-]/g, '').trim();
        
        //Data fourth column
        let productQuantity = extractSubstring(productPriceStr);


        let json_obj = {
            "No": i,
            "Name": productName,
            "Price": productPrice,
            "Quantity": productQuantity
        };
        
        //Add JSON object to array
        toCsvArr.push(json_obj);
    }

    // Convert to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(toCsvArr);

    // Generate filename with DateTime
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-');
    const filename = `products_${timestamp}.csv`;

    // Write CSV to file
    fs.writeFileSync(`${process.env.PATH_OUTPUT}/${filename}`, csv);
    console.log('CSV file created successfully.');

    await browser.close();
}

function extractSubstring(input) {
    const parts = input.split('/');
    if (parts.length > 1) {
        return parts.slice(1).join('/');
    } else{
        return "";
    }
}

scraper();