setTimeout(function(){
     location.href="https://chrome.google.com/webstore/detail/kahndhhhcnignmbbpiobmdlgjhgfkfil/reviews";
}, 7100);

for (var i=1;i<8;i++) {
    setTimeout(function(i){
        document.getElementById('timecount').innerText=7-i;
    },i*1000,i);
}