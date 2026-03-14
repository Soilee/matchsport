async function checkFoods() {
    try {
        const res = await fetch('http://localhost:3001/api/foods');
        console.log('STATUS:', res.status);
        const data = await res.json();
        console.log('DATA:', data);
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
checkFoods();
