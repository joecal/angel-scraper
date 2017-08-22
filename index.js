const start_page = 'https://angel.co/alajuela'

const fs = require('fs');
const jsonexport = require('jsonexport');
const Xray = require('x-ray');
const x = Xray();
const HeadlessChrome = require('simple-headless-chrome')

const browser = new HeadlessChrome({
  headless: true
})

let temp_startup_array = [];
let final_startup_array = [];
let no_results = false;
let finished_scrape = false;

let min = 3000
let max = 5000

function randomNumber(min,max) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

async function runBot() {
  try {

    console.log('Initializing browser')
    await browser.init()

    console.log('Setting private tab')
    const mainTab = await browser.newTab({ privateTab: true })

    console.log('Navigating to ' + start_page)
    await mainTab.goTo(start_page)

    console.log('Waiting 5 seconds for content to load')
    await mainTab.wait(5000)

    console.log('Running runScrapes() function to see if all startups are loaded on the page')
    async function runScrapes(index) {

      console.log('Evaluating companies element')
      const htmlTag0 = await mainTab.evaluate(function(selector) {
        const selectorHtml = document.querySelector(selector)
        return selectorHtml.innerText
      }, 'a.c-navbar-item.c-navbar-item--selected');

      console.log('Setting element_value0 variable')
      const element_value0 = await htmlTag0.result.value

      console.log('Searching for startups')
      const companies = await element_value0.substr(0, element_value0.indexOf(" "));

      await console.log(companies + " startups found")

      if (companies === "0"){

        no_results = true

        console.log('Closing browser')
        mainTab.close(true)
        browser.close(true)

      } else {

        console.log('Evaluating "More" button element')
        const htmlTag1 = await mainTab.evaluate(function(selector) {
          const selectorHtml = document.querySelector(selector)
          return selectorHtml.style.display
        }, 'div.more.hidden');

        console.log('Setting element_value1 variable')
        const element_value1 = await htmlTag1.result.value

        if (element_value1 && element_value1 === "block") {

          const times = parseInt(companies/20)

          console.log('Clicking "More" button ' + (index + 1) + ' of ' + times + ' times')
          await mainTab.click('div.more.hidden')

          console.log('Waiting a few seconds for content to load')
          await mainTab.wait(randomNumber(min,max))

          return runScrapes(index + 1)
        }

        if (element_value1 && element_value1 === "none") {

          console.log('All results loaded on the page')

          console.log('Evaluating results element')
          const htmlTag2 = await mainTab.evaluate(function(selector) {
            const selectorHtml = document.querySelector(selector)
            return selectorHtml.innerHTML
          }, 'div.results_holder');

          console.log('Setting element_value2 variable')
          const element_value2 = await htmlTag2.result.value

          if (element_value2 && no_results === false) {

            console.log('Scraping startup names and urls')
            x(element_value2, '.name', [{
              Name: 'a',
              Website: 'a@href'
            }])((error, names_urls) => {
              if(error){
                throw error
              } else {
                let jsonObj = JSON.stringify(names_urls);

                console.log('Pushing startup names and urls to temp_startup_array')
                temp_startup_array.push(names_urls)

                console.log('Writing scraped startup names and urls to links.json')
                fs.writeFileSync('links.json', jsonObj, 'utf8');
                finished_scrape = true;
              }
            })
          }
        }

        if (finished_scrape === true) {

          console.log('Running scrapeLoop(0) function to start scraping data from the urls in temp_startup_array')
          scrapeLoop(0)
          function scrapeLoop(i) {

            if (temp_startup_array[0].length > i) {
              setTimeout(() => {

                navThenScrape()
                async function navThenScrape() {

                  console.log('Navigating to ' + temp_startup_array[0][i].Website)
                  await mainTab.goTo(temp_startup_array[0][i].Website)

                  console.log('Waiting a few seconds for content to load')
                  await mainTab.wait(randomNumber(min,max))

                  console.log('Evaluating body element')
                  const htmlTag3 = await mainTab.evaluate(function(selector) {
                    const selectorHtml = document.querySelector(selector)
                    return selectorHtml.innerHTML
                   }, 'body');

                  console.log('Setting element_value3 variable')
                  const element_value3 = await htmlTag3.result.value

                  await checkForEmployees()

                  function checkForEmployees() {

                    x(element_value3, 'div.section.dsss17.startups-show-sections.ftm23.team._a._jm', {
                      Name: 'a@name'
                    })((error, data) => {
                      if (error) {
                        throw error
                      } else {
                        el = data.Name
                      }
                    })

                    if (el != null && el === 'employees_section') {
                      employees_value = '.team .name a'
                    } else {
                      employees_value = '.null'
                    }
                  }

                  if (element_value3 && employees_value) {
                    console.log('Scraping available data')
                    x(element_value3, {
                      Twitter: '.twitter_url@href',
                      Facebook: '.facebook_url@href',
                      Linkedin: '.linkedin_url@href',
                      Website: '.company_url@href',
                      Founders: ['.founders .name a'],
                      Employess: [employees_value]
                    })((error, data) => {
                      if (error) {
                        throw error
                      } else {
                        let url = temp_startup_array[0][i].Website
                        let pop = url.split(".co").pop();
                        let out = {
                          ['Company Name']: temp_startup_array[0][i].Name,
                          Twitter: data.Twitter,
                          Facebook: data.Facebook,
                          Linkedin: data.Linkedin,
                          ['Angel.co Url']: temp_startup_array[0][i].Website,
                          ['Company Url']: data.Website,
                          Founders: data.Founders,
                          Employess: data.Employess
                        }
                        for (let n = 0; n < data.length; n++) {
                          if (out.n === pop) {
                            out.n = null;
                          }
                        }
                        final_startup_array.push(out)
                        console.log("Scraped available data on page " + (i + 1) + " of " + temp_startup_array[0].length)
                      }
                    })
                  }
                  console.log('Re-run scrapeLoop() function')
                  await scrapeLoop(i + 1)
                }
              }, 3000);
            }

            if (temp_startup_array[0].length === i && no_results === false) {

              console.log('Success! All available data has been scraped!')

              let json_object = JSON.stringify(final_startup_array);

              console.log('Writing results to startups.json')
              fs.writeFileSync('startups.json', json_object, 'utf8');

              console.log('Writing results to startups.csv')
              jsonexport(final_startup_array,function(err, csv){
                if(err) return console.log(err);
                fs.writeFileSync('startups.csv', csv, 'ascii');
              });

              console.log('Closing browser')
              mainTab.close(true)
              browser.close(true)
            }
          }
        }
      }
    }
    await runScrapes(0)
  }

  catch(error) {

    let results_json_object = JSON.stringify(final_startup_array);

    console.log("Caught this error: ", error)

    console.log('Writing partial results to partial_startups.json')
    fs.writeFileSync('partial_startups.json', results_json_object, 'utf8');

    console.log('Writing partial results to partial_startups.csv')
    jsonexport(final_startup_array,function(err, csv){
      if(err) return console.log(err);
      fs.writeFileSync('partial_startups.csv', csv, 'ascii');
    });

    console.log('Closing browser')
    mainTab.close(true)
    browser.close(true)
  }
 }

console.log('Starting...')
runBot()
