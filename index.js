import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000; 

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "anime_list",
    password: "pg1204",
    port: 5432,
  });
  db.connect();

async function getAnime() {
    let anime = [];
    const result = await db.query("SELECT * from anime");
    anime = result.rows;
    //console.log(anime);
    return anime;
}

async function genreToAnime(genres, id) {
    
    // Corrected query using ANY
    const result = await db.query("SELECT gid FROM genre WHERE name = ANY($1::text[])", [genres]);
    
    // Iterate over the resulting rows and insert into anime_genre
    for (const genre of result.rows) {
        await db.query("INSERT INTO anime_genre (aid, gid) VALUES($1, $2)", [id, genre.gid]);
    }
}


app.get("/", async (req, res) => {
    res.render("index.ejs", {
        anime: await getAnime()
    });
});


app.get("/new", async (req, res) => {
    const result = await db.query("SELECT name FROM genre ORDER BY name ASC");
    const genres = result.rows.map(row => row.name);  // Extract the genre names
    res.render("new.ejs", { genres });
});

// Route to display the edit form
app.get('/edit/:id', async (req, res) => {
    const postId = req.params.id;
    console.log(postId);
    const anime = await getAnime();
    const post = anime.find(p => p.id == postId);
    const result = await db.query("SELECT name FROM genre ORDER BY name ASC");
    const genres = result.rows.map(row => row.name);  // Extract the genre names
    const postGenreIdResult = await db.query('SELECT gid FROM anime_genre WHERE aid = $1', [req.params.id]);  // Get already selected genres
    const postGenresIds = postGenreIdResult.rows.map(row => row.gid);
    const preselectedGenres = await db.query('SELECT * FROM genre WHERE gid = ANY($1)', [postGenresIds]);
    //console.log(genres);
    //console.log(preselectedGenres);
    
    if (post) {
        res.render('edit.ejs', { post: post, genres, preselectedGenres: preselectedGenres.rows.map(row => row.name)});
    } else {
        res.status(404).send('Post not found');
    }
});

// Route to handle the edit form submission
app.post('/edit/:id', (req, res) => {
    const postId = req.params.id;
    const postIndex = posts.findIndex(p => p.id == postId);
    if (postIndex !== -1) {
        posts[postIndex].title = req.body.title;
        posts[postIndex].content = req.body.content;
        res.redirect('/');
    } else {
        res.status(404).send('Post not found');
    }
});

// Handle form submission
app.post('/review', async (req, res) => {

    const newReview = {
      title: req.body.title,
      date: req.body.date,
      season: req.body.season,
      year: req.body.year,
      thoughts: req.body.thoughts,
      summary: req.body.summary,
      image: req.body.image,
      rating: req.body.rating, 
      other: req.body.other 
    };
    //console.log(req.body);
    const result = await db.query("INSERT INTO anime (title, post_date, season, release_year, personal_thoughts, summary, image, rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
         [newReview.title, newReview.date, newReview.season, newReview.year, newReview.thoughts, newReview.summary, newReview.image, newReview.rating]);
    const id = result.rows[0].id;
    const genres = [req.body.genres];
    if (newReview.other) {
        await db.query("INSERT INTO genre (name) VALUES($1)", [newReview.other]);
        genres.push(newReview.other);
        // insert into new.ejs form a new option with value and label of the 'other' genre
    }
    //console.log(req.body.genres);
    genreToAnime(genres, id);
    res.redirect("/");
  });


app.listen(port, () => {
console.log(`Server running on port ${port}`);
});

