const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { fixtures } = require('./bookmarks.fixtures')

describe.only('Bookmarks Endpoints', function() {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  describe(`GET /bookmarks`, () => {
    context(`Given no bookmarks`, () => {
     it(`responds with 200 and an empty list`, () => {
       return supertest(app)
         .get('/bookmarks')
         .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
         .expect(200, [])
     })
   })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  })

  describe(`GET /bookmarks/:id`, () => {
    context(`Given no bookmarks`, () => {
     it(`responds with 404`, () => {
       const bookmark_id = 123456
       return supertest(app)
         .get(`/bookmarks/${bookmark_id}`)
         .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
         .expect(404, { error: { message: `Bookmark Not Found` } })
     })
   })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmark_id = 2
        const expectedBookmark = testBookmarks[bookmark_id - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmark_id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })
  })
})
