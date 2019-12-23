const lotion = require('lotion')

let app = lotion({
  initialState: {
    count: 0
  }
})

// Middleware MUST be deterministic
app.use((state, tx) => {
  if (state.count === tx.nonce) {
    state.count++
  }
})

app.listen(3000).then(genesis => {
  console.log(genesis)
    console.log('App listening on port 3000. Congrats, you have launched your first blockchain!')
})

app.start()
