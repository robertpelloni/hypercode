if vim.g.loaded_hypercode then
    return
end
vim.g.loaded_hypercode = true

vim.api.nvim_create_user_command("HypercodeSetup", function()
    require("hypercode").setup()
end, { desc = "Setup Hypercode plugin" })
