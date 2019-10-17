const express = require('express')
const uuid = require('uuid/v4')
const logger = require('./logger')
// const { bookmarks } = require('./store')
const BookmarksService = require('./bookmarks-service')
const xss = require('xss')

const bookmarkRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: bookmark.rating,
})

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
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const reqFields = { title, url, rating}

    for (const [key, value] of Object.entries(reqFields)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
        logger.error(`${key} is missing in request body`);
      }
    }

    if (Number.isNaN(parseInt(rating)) || rating < 0 || rating > 5) {
      logger.error('Rating is not valid')
      return res
        .status(400)
        .send('Rating must be a number between 0 and 5')
    }

    const newBookmark = { title, url, description, rating };

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        logger.info(`Bookmark with id ${bookmark.id} created`);
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(serializeBookmark(bookmark))
      })
      .catch(next)

  })

bookmarkRouter
  .route('/bookmarks/:bookmark_id')
  .all((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.getById(
      req.app.get('db'),
      bookmark_id
    )
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`bookmark with id ${bookmark_id} not found.`)
          return res
          .status(404)
          .json({
            error: { message: `Bookmark Not Found` }
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializeBookmark(res.bookmark))
  })
  .delete((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      bookmark_id
    )
      .then(() => {
        logger.info(`Bookmark with id ${bookmark_id} deleted`)
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = bookmarkRouter
