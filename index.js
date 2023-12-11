const express = require("express");
const axios = require("axios");
const { map } = require("lodash");
const app = express();

const DOMAIN = `auctions.yahoo.co.jp`;
const HOME_URL = `https://${DOMAIN}/list1/jp/0-all.html`;
const PRODUCT_BY_CATEGORY_PREFIX_URL = `https://${DOMAIN}/category/list/`;
const CATEGORY_REGEX = /<a\s+href="(.*?)">[\s\S]*?<span>(.*?)<\/span><\/a>/g;
const CATEGORY_ID_REGEX = /(\d+)(?!.*\d)/;
const PRODUCT_LINK_REGEX =
  /<a\s+class="Product__imageLink[^"]*"[^>]*\s+href="([^"]*)"/g;

app.get("/craw", async (req, res) => {
  try {
    const response = await axios.get(HOME_URL);
    const htmlContent = response.data;

    const categories = getCategories(htmlContent);
    const productsByCategories = await getProductsByCategories(categories);
    res.send({ total: productsByCategories.length, productsByCategories });
  } catch (error) {
    res.status(500).send("Error fetching HTML content");
  }
});

/**
 * getCategories
 * @param {string} htmlContent
 * @returns array
 */
const getCategories = (htmlContent = "") => {
  let matches;
  const results = [];
  while ((matches = CATEGORY_REGEX.exec(htmlContent)) !== null) {
    const categoryUrl = matches[1];
    const categoryIdMatch = categoryUrl.match(CATEGORY_ID_REGEX);

    if (categoryIdMatch) {
      results.push({
        name: matches[2],
        url: categoryUrl,
        id: categoryIdMatch[1],
      });
    }
  }

  return results;
};

/**
 * getProductsByCategories
 * @param {array} categories
 * @returns array
 */
const getProductsByCategories = async (categories) => {
  return await Promise.all(
    map(categories, async (category) => {
      const URL = `${PRODUCT_BY_CATEGORY_PREFIX_URL}${category.id}`;
      try {
        const response = await axios.get(URL);
        const htmlContent = response.data;
        const products = [];
        if (htmlContent) {
          while ((matches = PRODUCT_LINK_REGEX.exec(htmlContent)) !== null) {
            const productUrl = matches[1];

            if (productUrl) {
              products.push({
                url: productUrl,
              });
            }
          }
        }

        return { ...category, products };
      } catch (error) {
        console.log("RATE LIMIT QUERY FOR CATEGORY: ", category);
      }
    })
  );
};

const port = 3003;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
