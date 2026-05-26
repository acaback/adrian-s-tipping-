const fetchWithRetry = async (url, options = {}, retries = 3, timeout = 15000) => {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      console.log(`Attempt ${i + 1} for ${url}...`);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (response.ok) return response;
      console.warn(`Attempt ${i + 1} failed with status: ${response.status}`);
    } catch (error) {
      clearTimeout(id);
      console.warn(`Attempt ${i + 1} error: ${error.message}`);
    }
    if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Failed to fetch ${url}`);
};

async function checkYear(year) {
  try {
    const res = await fetchWithRetry(`https://api.squiggle.com.au/?q=games&year=${year}`);
    const data = await res.json();
    console.log(`Year ${year}: ${data.games?.length || 0} games found.`);
    if (data.games?.length > 0) {
        console.log(`Example game: ${data.games[0].date} ${data.games[0].hteam} vs ${data.games[0].ateam}`);
    }
  } catch (e) {
    console.error(`Year ${year} failed: ${e.message}`);
  }
}

async function run() {
  await checkYear(2024);
  await checkYear(2025);
  await checkYear(2026);
}

run();
