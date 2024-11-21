console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded');
  
  let newsContainer = document.getElementById('news-container');
  
  if (!newsContainer) {
    console.warn('News container element not found, creating one');
    newsContainer = document.createElement('div');
    newsContainer.id = 'news-container';
    document.body.appendChild(newsContainer);
  }

  console.log('News container found or created, sending fetchNews message');
  
  chrome.runtime.sendMessage({action: 'fetchNews'}, function(response) {
    console.log('Received response from background script:', response);
    
    if (chrome.runtime.lastError) {
      console.error('Error fetching news:', chrome.runtime.lastError);
      displayError('Failed to fetch news. Please try again later.');
    } else if (response && response.error) {
      displayError(response.error);
    } else if (response) {
      displayNews(response);
    } else {
      displayError('No data received from the background script.');
    }
  });

  function displayNews(newsData) {
    console.log('Displaying news data:', newsData);
    newsContainer.innerHTML = '';

    if (Object.keys(newsData).length === 0) {
      newsContainer.innerHTML = '<p>No news data available.</p>';
      return;
    }

    for (const [category, articles] of Object.entries(newsData)) {
      const categoryElement = document.createElement('div');
      categoryElement.className = 'news-category';
      categoryElement.innerHTML = `<h2>${category}</h2>`;

      const articleList = document.createElement('ul');
      if (articles && articles.length > 0) {
        articles.forEach(article => {
          const listItem = document.createElement('li');
          listItem.innerHTML = `
            <a href="${article.url}" target="_blank">${article.title}</a>
            <p>${article.summary}</p>
            <small>Published: ${article.publishedAt}</small>
          `;
          articleList.appendChild(listItem);
        });
      } else {
        articleList.innerHTML = '<li>No articles available for this category.</li>';
      }

      categoryElement.appendChild(articleList);
      newsContainer.appendChild(categoryElement);
    }
  }

  function displayError(error) {
    console.error('Displaying error:', error);
    newsContainer.innerHTML = `<p class="error">Error: ${error}</p>`;
  }
});
