const express = require('express')
const uuid = require('uuid/v4')
const logger = require('./logger')
// const { bookmarks } = require('./store')
const BookmarksService = require('./bookmarks-service')

const bookmarkRouter = express.Router()
const bodyParser = express.json()

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res) => {
    const { title, url, description, rating } = req.body;

    if (!title) {
    logger.error(`Title is required`);
    return res.status(400).send('Invalid data');
  }

    if (!url) {
      logger.error(`URL is required`);
      return res.status(400).send('Invalid data');
    }

    if (!description) {
      logger.error(`Description is required`);
      return res.status(400).send('Invalid data');
    }

    if (!rating) {
      logger.error(`Rating is required`);
      return res.status(400).send('Invalid data');
    }

    if (Number.isNaN(parseInt(rating)) || rating < 0 || rating > 5) {
      logger.error('Rating is not valid')
      return res
        .status(400)
        .send('Rating must be a number between 0 and 5')
    }

    // get an id
    const id = uuid();

    const bookmark = {
      id,
      title,
      url,
      rating
    };

    bookmarks.push(bookmark);

    logger.info(`Bookmark with id ${id} created`);

    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${id}`)
      .json(bookmark);
  })

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res, next) => {
    const { id } = req.params
    const knexInstance = req.app.get('db')
    BookmarksService.getById(knexInstance, id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`bookmark with id ${id} not found.`)
          return res
          .status(404)
          .json({
            error: { message: `Bookmark Not Found` }
          })
        }
        res.json(bookmark)
      })
      .catch(next)
  })
  .delete((req, res) => {
    const { id } = req.params

    const bookmarkIndex = bookmarks.findIndex(b => b.id == id)

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found`)
      return res
        .status(404)
        .send('Not found')
    }

    bookmarks.splice(bookmarkIndex, 1)

    logger.info(`Bookmark with id ${id} deleted`)
    res
      .status(204)
      .end()
  })

module.exports = bookmarkRouter
