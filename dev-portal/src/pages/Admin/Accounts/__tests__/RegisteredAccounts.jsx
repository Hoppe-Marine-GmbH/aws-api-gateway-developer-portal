import _ from 'lodash'
import React from 'react'
import * as rtl from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import * as testUtils from 'utils/test-utils'
import * as accountsTestUtils from 'utils/accounts-test-utils'

import RegisteredAccounts from 'pages/Admin/Accounts/RegisteredAccounts'
import * as AccountsTable from 'components/Admin/Accounts/AccountsTable'
import * as AccountService from 'services/accounts'

jest.mock('services/accounts')

// TODO: remove when React 16.9 is released
testUtils.suppressReact16Dot8ActWarningsGlobally()

afterEach(rtl.cleanup)

const renderPage = () => testUtils.renderWithRouter(<RegisteredAccounts />)

describe('RegisteredAccounts page', () => {
  it('renders', async () => {
    AccountService.fetchRegisteredAccounts = jest.fn().mockResolvedValue([])
    const page = renderPage()
    expect(page.baseElement).toBeTruthy()
  })

  it('initially shows the loading state', async () => {
    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockReturnValue(new Promise(() => {}))

    const page = renderPage()
    expect(page.queryAllByTestId('accountRowPlaceholder')).not.toHaveLength(0)
  })

  it('shows the accounts after loading', async () => {
    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)
    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    _.range(AccountsTable.DEFAULT_PAGE_SIZE).forEach(index =>
      expect(page.queryByText(`${index}@example.com`)).not.toBeNull(),
    )
  })

  it('orders pages for all accounts', async () => {
    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const pagination = page.getByRole('navigation')

    const page1Button = rtl.queryByText(pagination, '1')
    expect(page1Button).not.toBeNull()

    const page16Button = rtl.queryByText(pagination, '16')
    expect(page16Button).not.toBeNull()
    rtl.fireEvent.click(page16Button)
    expect(
      page.queryByText(`${NUM_MOCK_ACCOUNTS - 1}@example.com`),
    ).not.toBeNull()
  })

  it('orders accounts by email address', async () => {
    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId('accountsTable')
    const emailAddressHeader = rtl.getByText(table, 'Email address')
    rtl.fireEvent.click(emailAddressHeader)

    // Check that first page is correct
    _(MOCK_ACCOUNTS)
      .orderBy(['emailAddress'], ['asc'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ emailAddress }) => rtl.getByText(table, emailAddress))

    // Check that last page is correct
    const pagination = page.getByRole('navigation')
    const lastPageButton = rtl.getByLabelText(pagination, 'Last item')
    rtl.fireEvent.click(lastPageButton)
    _(MOCK_ACCOUNTS)
      .orderBy(['emailAddress'], ['asc'])
      .drop(
        Math.floor(NUM_MOCK_ACCOUNTS / AccountsTable.DEFAULT_PAGE_SIZE) *
          AccountsTable.DEFAULT_PAGE_SIZE,
      )
      .forEach(({ emailAddress }) => rtl.getByText(table, emailAddress))

    // Order descending, go back to first page
    rtl.fireEvent.click(emailAddressHeader)
    const firstPageButton = rtl.getByLabelText(pagination, 'First item')
    rtl.fireEvent.click(firstPageButton)

    // Check that first page is correct
    _(MOCK_ACCOUNTS)
      .orderBy(['emailAddress'], ['desc'])
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ emailAddress }) => rtl.getByText(table, emailAddress))
  })

  it('orders accounts by date registered', async () => {
    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)

    // Order ascending
    const table = page.getByTestId('accountsTable')
    const dateRegisteredHeader = rtl.getByText(table, 'Date registered')
    rtl.fireEvent.click(dateRegisteredHeader)

    // Check that first page is correct
    _(MOCK_ACCOUNTS)
      .orderBy('dateRegistered')
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ emailAddress }) => rtl.getByText(table, emailAddress))
  })

  it('filters accounts by email address', async () => {
    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const table = page.getByTestId('accountsTable')

    rtl.fireEvent.change(filterInput, { target: { value: '11' } })
    _(MOCK_ACCOUNTS)
      .filter(({ emailAddress }) => emailAddress.includes('11'))
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ emailAddress }) => rtl.getByText(table, emailAddress))

    rtl.fireEvent.change(filterInput, { target: { value: '111' } })
    rtl.getByText(table, '111@example.com')
    expect(rtl.getAllByText(table, /@example\.com/)).toHaveLength(1)

    rtl.fireEvent.change(filterInput, { target: { value: 'apiKeyId' } })
    expect(rtl.queryAllByText(table, /@example\.com/)).toHaveLength(0)
  })

  it('filters accounts by API key', async () => {
    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const filterDropdown = page.getByTestId('filterDropdown')
    const table = page.getByTestId('accountsTable')

    rtl.fireEvent.click(filterDropdown)
    const filterByApiKeyIdOption = rtl.getByText(filterDropdown, 'API key ID')
    rtl.fireEvent.click(filterByApiKeyIdOption)

    rtl.fireEvent.change(filterInput, { target: { value: '15' } })
    _(MOCK_ACCOUNTS)
      .filter(({ apiKeyId }) => apiKeyId.includes('15'))
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ apiKeyId }) => rtl.getByText(table, apiKeyId))

    rtl.fireEvent.change(filterInput, { target: { value: '155' } })
    rtl.getByText(table, 'apiKeyId155')
    expect(rtl.getAllByText(table, /apiKeyId/)).toHaveLength(1)

    rtl.fireEvent.change(filterInput, { target: { value: '@example.com' } })
    expect(rtl.queryAllByText(table, /apiKeyId/)).toHaveLength(0)
  })

  it('filters and orders at the same time', async () => {
    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const filterInput = page.getByPlaceholderText('Search by...')
    const table = page.getByTestId('accountsTable')
    const dateRegisteredHeader = rtl.getByText(table, 'Date registered')

    rtl.fireEvent.change(filterInput, { target: { value: '13' } })
    rtl.fireEvent.click(dateRegisteredHeader)
    _(MOCK_ACCOUNTS)
      .filter(({ emailAddress }) => emailAddress.includes('13'))
      .orderBy('dateRegistered')
      .take(AccountsTable.DEFAULT_PAGE_SIZE)
      .forEach(({ emailAddress }) => rtl.getByText(table, emailAddress))
  })

  it('deletes an account', async () => {
    const targetAccountEmail = '1@example.com'
    const targetAccountIdentityPoolId = 'identityPoolId1'

    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)
      .mockResolvedValueOnce(
        MOCK_ACCOUNTS.filter(
          account => account.emailAddress !== targetAccountEmail,
        ),
      )
    AccountService.deleteAccountByIdentityPoolId = jest
      .fn()
      .mockResolvedValueOnce(undefined)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const table = page.getByTestId('accountsTable')
    const targetAccountEmailCell = rtl.getByText(table, targetAccountEmail)
    const deleteButton = page.getByText('Delete')

    expect(deleteButton.disabled === true)
    rtl.fireEvent.click(targetAccountEmailCell)
    expect(deleteButton.disabled === false)
    rtl.fireEvent.click(deleteButton)

    const modal = rtl.getByText(document, 'Confirm deletion').closest('.modal')
    const confirmDeleteButton = rtl.getByText(modal, 'Delete')
    rtl.getByText(modal, targetAccountEmail)
    rtl.fireEvent.click(confirmDeleteButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    expect(rtl.queryByText(document, 'Confirm deletion')).toBeNull()
    expect(
      AccountService.deleteAccountByIdentityPoolId.mock.calls,
    ).toHaveLength(1)
    expect(
      AccountService.deleteAccountByIdentityPoolId.mock.calls[0][0],
    ).toEqual(targetAccountIdentityPoolId)

    await rtl.wait(() =>
      expect(page.getByText(/Deleted account/)).toBeInTheDocument(),
    )
    expect(rtl.queryByText(table, targetAccountEmail)).toBeNull()
  })

  it('shows a message when deletion fails', async () => {
    const targetAccountEmail = '1@example.com'
    const errorMessage = 'Something weird happened!'

    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)
    AccountService.deleteAccountByIdentityPoolId = jest
      .fn()
      .mockImplementation(() => Promise.reject(new Error(errorMessage)))

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const table = page.getByTestId('accountsTable')
    const targetAccountEmailCell = rtl.getByText(table, targetAccountEmail)
    const deleteButton = page.getByText('Delete')
    rtl.fireEvent.click(targetAccountEmailCell)
    rtl.fireEvent.click(deleteButton)

    const modal = rtl.getByText(document, 'Confirm deletion').closest('.modal')
    const confirmDeleteButton = rtl.getByText(modal, 'Delete')
    rtl.getByText(modal, targetAccountEmail)
    rtl.fireEvent.click(confirmDeleteButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    await rtl.wait(() =>
      expect(page.getByText(/Failed to delete account/)).toBeInTheDocument(),
    )
    expect(rtl.getByText(table, targetAccountEmail)).toBeInTheDocument()
  })

  it('promotes an account', async () => {
    const targetAccountEmail = '2@example.com'
    const targetAccountIdentityPoolId = 'identityPoolId2'

    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)
    AccountService.promoteAccountByIdentityPoolId = jest
      .fn()
      .mockResolvedValueOnce(undefined)

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const table = page.getByTestId('accountsTable')
    const targetAccountEmailCell = rtl.getByText(table, targetAccountEmail)
    const promoteButton = page.getByText('Promote to Admin')

    expect(promoteButton.disabled === true)
    rtl.fireEvent.click(targetAccountEmailCell)
    expect(promoteButton.disabled === false)
    rtl.fireEvent.click(promoteButton)

    const modal = rtl.getByText(document, 'Confirm promotion').closest('.modal')
    const confirmPromoteButton = rtl.getByText(modal, 'Promote')
    rtl.getByText(modal, targetAccountEmail)
    rtl.fireEvent.click(confirmPromoteButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    expect(rtl.queryByText(document, 'Confirm promotion')).toBeNull()
    expect(
      AccountService.promoteAccountByIdentityPoolId.mock.calls,
    ).toHaveLength(1)
    expect(
      AccountService.promoteAccountByIdentityPoolId.mock.calls[0][0],
    ).toEqual(targetAccountIdentityPoolId)

    await rtl.wait(() =>
      expect(page.getByText(/Promoted account/)).toBeInTheDocument(),
    )
    expect(rtl.getByText(table, targetAccountEmail)).toBeInTheDocument()
  })

  it('shows a message when promotion fails', async () => {
    const targetAccountEmail = '2@example.com'
    const errorMessage = 'Something strange occurred.'

    AccountService.fetchRegisteredAccounts = jest
      .fn()
      .mockResolvedValueOnce(MOCK_ACCOUNTS)
    AccountService.deleteAccountByIdentityPoolId = jest
      .fn()
      .mockImplementation(() => Promise.reject(new Error(errorMessage)))

    const page = renderPage()
    await accountsTestUtils.waitForAccountsToLoad(page)
    const table = page.getByTestId('accountsTable')
    const targetAccountEmailCell = rtl.getByText(table, targetAccountEmail)
    const deleteButton = page.getByText('Delete')
    rtl.fireEvent.click(targetAccountEmailCell)
    rtl.fireEvent.click(deleteButton)

    const modal = rtl.getByText(document, 'Confirm deletion').closest('.modal')
    const confirmDeleteButton = rtl.getByText(modal, 'Delete')
    rtl.getByText(modal, targetAccountEmail)
    rtl.fireEvent.click(confirmDeleteButton)

    await accountsTestUtils.waitForAccountsToLoad(page)
    await rtl.wait(() =>
      expect(page.getByText(/Failed to delete account/)).toBeInTheDocument(),
    )
    expect(rtl.getByText(table, targetAccountEmail)).toBeInTheDocument()
  })
})

const NUM_MOCK_ACCOUNTS = 157 // should be prime

const MOCK_DATES_REGISTERED = (() => {
  const now = Date.now()
  return _.range(NUM_MOCK_ACCOUNTS).map(
    index => new Date(now + ((index * 3) % NUM_MOCK_ACCOUNTS) * 1000),
  )
})()

const MOCK_ACCOUNTS = _.range(NUM_MOCK_ACCOUNTS).map(index => ({
  identityPoolId: `identityPoolId${index}`,
  userPoolId: `userPoolId${index}`,
  emailAddress: `${index}@example.com`,
  dateRegistered: MOCK_DATES_REGISTERED[index].toJSON(),
  apiKeyId: `apiKeyId${index}`,
  registrationMethod: _.sample(['open', 'invite', 'request']),
  isAdmin: index % 20 === 0,
}))